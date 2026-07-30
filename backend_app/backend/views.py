# views.py
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Sum, Case, When, IntegerField, Prefetch
from django.db import models, connection, transaction
from django.utils import timezone
from django.contrib.auth import get_user_model, authenticate
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings

from rest_framework import viewsets, generics, status, permissions, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.authtoken.models import Token
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

from uuid import uuid4
from datetime import timedelta
import mimetypes
import logging

from .models import (
    User, Chat, Message, MessageMedia, MessageStatus, 
    MessageReaction, Call, CallParticipant, CallQuality, Contact
)
from .serializers import (
    UserSerializer, UserProfileSerializer, ChatSerializer, ChatUpdateSerializer, 
    ChatListSerializer, MessageSerializer, MessageMediaSerializer,
    MessageStatusSerializer, MessageReactionSerializer, CallSerializer,
    CallParticipantSerializer, CallQualitySerializer, CallUpdateSerializer,
    MessageSummarySerializer, CallJoinSerializer,
    PasswordResetSerializer, EmailVerificationSerializer,
    PasswordResetRequestSerializer, WebSocketTokenSerializer,
    ContactSerializer, AddContactSerializer
)

# Set up logging
logger = logging.getLogger(__name__)


def clear_cache_by_prefix(prefix):
    """Safely clear cache keys for backends that do not expose delete_pattern()."""
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(prefix)
            return
    except Exception:
        logger.warning("delete_pattern() is unavailable or failed for cache backend", exc_info=True)

    try:
        backend = cache
        local_cache = getattr(backend, '_cache', None)
        if local_cache is not None:
            for key in list(local_cache.keys()):
                if key.startswith(prefix):
                    backend.delete(key)
            return
    except Exception:
        logger.warning("Fallback cache key cleanup failed", exc_info=True)

    try:
        cache.clear()
    except Exception:
        logger.warning("cache.clear() failed during fallback cleanup", exc_info=True)


# Try to import psutil for disk health checks
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    psutil = None


# Define a standard pagination class
class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ========== AUTHENTICATION VIEWS ==========
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserSerializer
    throttle_classes = [AnonRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # Format validation errors for frontend
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    # Field-specific errors
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save(is_verified=False)

        # Generate verification code
        code = str(uuid4().int)[:6]
        user.verification_code = code
        user.save()

        # Send verification email
        try:
            send_mail(
                subject="Verify Your Account",
                message=f"Your verification code is: {code}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False
            )
        except Exception as e:
            logger.error(f"Failed to send verification email to {user.email}: {str(e)}")

        return Response(
            {
                "message": "User created. Verification code sent to email.",
                "user_id": user.id,
                "email": user.email
            },
            status=status.HTTP_201_CREATED
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    serializer_class = EmailVerificationSerializer
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        code = serializer.validated_data['verification_code']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.verification_code == code:
            user.is_verified = True
            user.verification_code = None
            user.save()
            
            # Create auth token
            token, _ = Token.objects.get_or_create(user=user)
            
            return Response({
                "status": "verified",
                "token": token.key,
                "user": UserSerializer(user).data
            })
        else:
            return Response({"error": "Invalid verification code."}, 
                          status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({"error": "Email is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        if user.is_verified:
            return Response({"error": "User already verified"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Generate new verification code
        code = str(uuid4().int)[:6]
        user.verification_code = code
        user.save()
        
        # Send verification email
        try:
            send_mail(
                subject="Verify Your Account",
                message=f"Your new verification code is: {code}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email]
            )
        except Exception as e:
            logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
            return Response({"error": "Failed to send email"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({"message": "Verification code resent"})


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)

        if not user:
            return Response({'error': 'Invalid username or password'}, 
                          status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_verified:
            return Response({'error': 'Please verify your email before logging in'}, 
                          status=status.HTTP_403_FORBIDDEN)

        if not user.is_active:
            return Response({'error': 'Your account has been disabled. Please contact support.'}, 
                          status=status.HTTP_403_FORBIDDEN)

        # Update last seen
        user.update_last_seen()

        token, _ = Token.objects.get_or_create(user=user)
        
        # Cache user data for faster access
        cache_key = f'user_data_{user.id}'
        cache.set(cache_key, {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_online': user.is_online
        }, 300)  # Cache for 5 minutes
        
        return Response({
            'token': token.key, 
            'user': UserSerializer(user).data,
            'user_id': user.id
        })


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return success even if user doesn't exist (security)
            return Response({"status": "reset_email_sent"})

        # Generate reset token
        token = uuid4()
        user.reset_token = token
        user.reset_token_expiry = timezone.now() + timedelta(hours=1)
        user.save()

        # Send email
        try:
            send_mail(
                subject="Password Reset",
                message=f"Your password reset token is: {token}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email]
            )
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return Response({"error": "Failed to send email"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"status": "reset_email_sent"})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['reset_token']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(
                reset_token=token, 
                reset_token_expiry__gte=timezone.now()
            )
        except User.DoesNotExist:
            return Response({"error": "Invalid or expired token"}, 
                          status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        user.save()
        
        # Delete all existing tokens for this user
        Token.objects.filter(user=user).delete()
        
        # Clear cache
        cache.delete(f'user_data_{user.id}')

        return Response({"status": "password_reset_success"})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Mark user as offline
        request.user.set_offline()
        
        # Delete token
        try:
            request.user.auth_token.delete()
        except (Token.DoesNotExist, AttributeError):
            pass
        
        # Clear cache
        cache.delete(f'user_data_{request.user.id}')
        
        return Response({'status': 'logged_out'})


class WebSocketTokenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Generate WebSocket token
        token_data = request.user.generate_websocket_token()
        return Response(token_data)


# ========== USER VIEWS ==========
class CurrentUserView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user


class UpdateProfileView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser] 
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_update(self, serializer):
        # Handle profile image upload properly
        profile_image = self.request.FILES.get('profile_image')
        if profile_image:
            # Validate file size
            if profile_image.size > 5 * 1024 * 1024:  # 5MB limit
                raise ValidationError("Profile image cannot exceed 5MB")
            
            # Validate file type
            valid_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if profile_image.content_type not in valid_types:
                raise ValidationError(f"Invalid image type. Allowed: {', '.join(valid_types)}")
            
            # Delete old profile image if exists
            if self.request.user.profile_image:
                self.request.user.profile_image.delete(save=False)
        
        serializer.save()
        
        # Clear user cache
        cache.delete(f'user_data_{self.request.user.id}')


class UserSearchView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    pagination_class = StandardPagination
    filter_backends = [SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        if not query:
            return User.objects.none()
        
        # Check cache for search results
        cache_key = f'user_search_{query}_{self.request.user.id}'
        cached_result = cache.get(cache_key)
        
        if cached_result is not None:
            return cached_result
        
        queryset = User.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).exclude(id=self.request.user.id).filter(is_active=True)[:50]
        
        # Cache for 30 seconds
        cache.set(cache_key, queryset, 30)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        # Override to return consistent response format
        queryset = self.filter_queryset(self.get_queryset())
        
        # If no pagination needed (small result set), return array directly
        if queryset.count() <= 50:
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        # Otherwise use pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    queryset = User.objects.filter(is_active=True)
    lookup_field = 'id'
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class UserOnlineStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        # Check cache first
        cache_key = f'user_status_{user_id}_{request.user.id}'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        response_data = {
            'is_online': user.is_online,
            'status': user.status
        }
        
        # Check privacy settings
        if user.privacy_last_seen == 'nobody' and user != request.user:
            response_data['privacy'] = 'hidden'
            response_data['last_seen'] = None
        elif user.privacy_last_seen == 'contacts' and user != request.user:
            # Check if users have a chat together
            has_chat = Chat.objects.filter(
                participants=user,
                chat_type='private'
            ).filter(participants=request.user).exists()
            
            if not has_chat:
                response_data['privacy'] = 'contacts_only'
                response_data['last_seen'] = None
            else:
                response_data['last_seen'] = user.last_seen
        else:
            response_data['last_seen'] = user.last_seen
        
        # Cache for 30 seconds
        cache.set(cache_key, response_data, 30)
        
        return Response(response_data)


class UpdateLastSeenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        request.user.update_last_seen()
        # Clear status cache
        clear_cache_by_prefix(f'user_status_{request.user.id}_')
        return Response({'status': 'last_seen_updated'})


class SetOfflineView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        request.user.set_offline()
        # Clear status cache
        clear_cache_by_prefix(f'user_status_{request.user.id}_')
        cache.delete(f'user_data_{request.user.id}')
        return Response({'status': 'offline'})


# ========== CHAT VIEWS ==========
class ChatListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ChatListSerializer
        return ChatSerializer
    
    def get_queryset(self):
        return Chat.objects.filter(
            participants=self.request.user
        ).filter(
            Q(is_active=True) | Q(is_active__isnull=True)
        ).select_related('admin').prefetch_related(
            Prefetch('participants', queryset=User.objects.all())
        ).distinct().order_by('-updated_at')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_create(self, serializer):
        chat = serializer.save()
        if self.request.user not in chat.participants.all():
            chat.participants.add(self.request.user)


class ChatDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatSerializer
    
    def get_queryset(self):
        return Chat.objects.filter(
            participants=self.request.user
        ).filter(
            Q(is_active=True) | Q(is_active__isnull=True)
        ).select_related('admin').prefetch_related(
            Prefetch('participants', queryset=User.objects.only(
                'id', 'username', 'first_name', 'last_name', 
                'profile_image', 'is_online', 'last_seen'
            ))
        ).distinct()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class CreatePrivateChatView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        participant_id = request.data.get('participant_id')
        
        if not participant_id:
            return Response({"error": "participant_id is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if int(participant_id) == request.user.id:
            return Response({"error": "Cannot create chat with yourself"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            participant = User.objects.get(id=participant_id, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if private chat already exists
        existing_chat = Chat.objects.filter(
            chat_type='private',
            participants=request.user
        ).filter(
            participants=participant
        ).prefetch_related('participants').first()
        
        if existing_chat:
            # Verify it has exactly these two participants
            participant_ids = set(existing_chat.participants.values_list('id', flat=True))
            if participant_ids == {request.user.id, participant.id}:
                serializer = ChatSerializer(existing_chat, context={'request': request})
                return Response(serializer.data)
        
        # Create new private chat using transaction to ensure atomicity
        from django.db import transaction
        
        with transaction.atomic():
            # Double-check inside transaction to prevent race conditions
            existing_chat = Chat.objects.filter(
                chat_type='private',
                participants=request.user
            ).filter(
                participants=participant
            ).prefetch_related('participants').first()
            
            if existing_chat:
                # Verify it has exactly these two participants
                participant_ids = set(existing_chat.participants.values_list('id', flat=True))
                if participant_ids == {request.user.id, participant.id}:
                    serializer = ChatSerializer(existing_chat, context={'request': request})
                    return Response(serializer.data)
            
            # Create new private chat
            chat = Chat.objects.create(chat_type='private', is_active=True)
            chat.participants.add(request.user, participant)
            
            serializer = ChatSerializer(chat, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class AddParticipantView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, is_active=True)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant
        if not chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Check if user has permission (admin or creator)
        if chat.chat_type != 'private' and chat.admin != request.user:
            raise PermissionDenied("Only admin can add participants")
        
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        if chat.participants.filter(id=user.id).exists():
            return Response({"error": "User already in chat"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        chat.participants.add(user)
        
        # If this is the first participant after creation and no admin set
        if chat.chat_type == 'group' and not chat.admin:
            chat.admin = user
            chat.save()
        
        # Clear chat cache
        cache.delete(f'chat_{chat.id}')
        
        return Response({"status": "participant_added"})


class RemoveParticipantView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, is_active=True)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant
        if not chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Check if user has permission (admin or creator)
        if chat.chat_type != 'private' and chat.admin != request.user:
            raise PermissionDenied("Only admin can remove participants")
        
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        if user == request.user:
            return Response({"error": "Cannot remove yourself. Use leave chat instead."}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if not chat.participants.filter(id=user.id).exists():
            return Response({"error": "User not in chat"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        chat.participants.remove(user)
        
        # Clear chat cache
        cache.delete(f'chat_{chat.id}')
        
        return Response({"status": "participant_removed"})


class LeaveChatView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, is_active=True)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        if chat.chat_type == 'private':
            return Response({"error": "Cannot leave private chat"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if not chat.participants.filter(id=request.user.id).exists():
            return Response({"error": "Not a participant"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        chat.participants.remove(request.user)
        
        # If admin leaves and there are other participants, assign new admin
        if chat.admin == request.user and chat.participants.exists():
            new_admin = chat.participants.first()
            chat.admin = new_admin
            chat.save()
        
        # If no participants left, deactivate chat
        if not chat.participants.exists():
            chat.is_active = False
            chat.save()
        
        # Clear chat cache
        cache.delete(f'chat_{chat.id}')
        
        return Response({"status": "left_chat"})


class UpdateChatInfoView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatUpdateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def get_object(self):
        chat_id = self.kwargs.get('chat_id')
        chat = get_object_or_404(Chat, id=chat_id, is_active=True)
        
        # Check if user is a participant
        if not chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        if chat.chat_type != 'group':
            raise ValidationError("Only group chats can be updated")
        
        if chat.admin != self.request.user:
            raise PermissionDenied("Only admin can update chat info")
        
        return chat
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_update(self, serializer):
        serializer.save()
        # Clear chat cache
        cache.delete(f'chat_{self.kwargs.get("chat_id")}')


class ChatMessagesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = StandardPagination
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        chat_id = self.kwargs.get('chat_id')
        chat = get_object_or_404(Chat, id=chat_id, is_active=True)
        
        # Check if user is a participant
        if not chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Mark messages as read (in bulk for efficiency)
        before = timezone.now()
        updated = MessageStatus.objects.filter(
            message__chat=chat,
            user=self.request.user,
            status__in=['sent', 'delivered']
        ).update(
            status='read',
            read_at=before
        )
        
        if updated > 0:
            logger.debug(f"Marked {updated} messages as read for user {self.request.user.id} in chat {chat_id}")
        
        # Get messages with optimized queries
        return Message.objects.filter(
            chat=chat,
            is_deleted=False
        ).select_related(
            'sender', 'reply_to'
        ).prefetch_related(
            Prefetch('media', queryset=MessageMedia.objects.only(
                'id', 'message', 'file', 'file_name', 'file_size',
                'mime_type', 'duration', 'width', 'height', 'thumbnail'
            )),
            Prefetch('reactions', queryset=MessageReaction.objects.select_related('user').only(
                'id', 'message', 'user', 'emoji', 'reacted_at'
            )),
            Prefetch('statuses', queryset=MessageStatus.objects.select_related('user').only(
                'id', 'message', 'user', 'status', 'delivered_at', 'read_at'
            ))
        ).order_by('-created_at')


class UnreadMessageCountView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check cache first
        cache_key = f'unread_counts_{request.user.id}'
        cached_counts = cache.get(cache_key)
        
        if cached_counts is not None:
            return Response(cached_counts)
        
        # Optimized query using annotations
        chats = Chat.objects.filter(
            participants=request.user,
            is_active=True
        ).annotate(
            unread=Count(
                Case(
                    When(
                        Q(messages__statuses__user=request.user) & 
                        Q(messages__statuses__status__in=['sent', 'delivered']) &
                        ~Q(messages__sender=request.user),
                        then=1
                    ),
                    output_field=IntegerField()
                )
            )
        ).values('id', 'unread')
        
        counts = {str(chat['id']): chat['unread'] for chat in chats}
        
        # Cache for 10 seconds
        cache.set(cache_key, counts, 10)
        
        return Response(counts)


# ========== MESSAGE VIEWS ==========
class MessageCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
    
    def create(self, request, *args, **kwargs):
        try:
            # Validate chat exists and user is participant before serializer validation
            chat_id = request.data.get('chat')
            if not chat_id:
                return Response({"error": "chat is required"}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            try:
                chat = Chat.objects.filter(
                    id=chat_id
                ).filter(
                    Q(is_active=True) | Q(is_active__isnull=True)
                ).first()
                
                if not chat:
                    return Response({"error": "Chat not found"}, 
                                  status=status.HTTP_404_NOT_FOUND)
                
                if not chat.participants.filter(id=request.user.id).exists():
                    return Response({"error": "Not a participant in this chat"}, 
                                  status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({"error": "Chat not found"}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            # Handle file uploads if present
            if request.FILES:
                return self._create_with_files(request, *args, **kwargs)
            return super().create(request, *args, **kwargs)
        except Exception as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Message creation error: {str(e)}", exc_info=True)
            
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_with_files(self, request, *args, **kwargs):
        """Create message with file attachments"""
        data = request.data.copy()
        
        # Validate chat
        chat_id = data.get('chat')
        if not chat_id:
            return Response({"error": "chat is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            chat = Chat.objects.filter(
                id=chat_id
            ).filter(
                Q(is_active=True) | Q(is_active__isnull=True)
            ).first()
            
            if not chat:
                return Response({"error": "Chat not found"}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            if not chat.participants.filter(id=request.user.id).exists():
                raise PermissionDenied("Not a participant in this chat")
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Determine message type from files if not already provided
        files = request.FILES.getlist('files')
        if files and not data.get('message_type'):
            # Set message type based on first file
            first_file = files[0]
            # Use the file's content_type if available, otherwise guess from name
            mime_type = first_file.content_type if hasattr(first_file, 'content_type') else None
            if not mime_type:
                mime_type, _ = mimetypes.guess_type(first_file.name)
            
            if mime_type:
                if mime_type.startswith('image/'):
                    data['message_type'] = 'image'
                elif mime_type.startswith('video/'):
                    data['message_type'] = 'video'
                elif mime_type.startswith('audio/'):
                    data['message_type'] = 'audio'
                else:
                    data['message_type'] = 'file'
            else:
                # Fallback to audio if filename contains audio-related terms
                if any(keyword in first_file.name.lower() for keyword in ['audio', 'voice', 'sound', 'webm', 'mp3', 'wav', 'ogg']):
                    data['message_type'] = 'audio'
                else:
                    data['message_type'] = 'file'
        
        # Create message first
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(sender=request.user)
        
        # Handle file uploads and create media objects
        media_objects = []
        for file in files:
            # Validate file size (50MB max)
            if file.size > 50 * 1024 * 1024:
                return Response({"error": f"File {file.name} exceeds 50MB limit"}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            mime_type = getattr(file, 'content_type', None)
            if not mime_type or mime_type == 'application/octet-stream':
                ext = os.path.splitext(file.name)[1].lower() if file.name else ''
                if ext == '.webm':
                    mime_type = 'audio/webm'
                else:
                    mime_type, _ = mimetypes.guess_type(file.name) if file.name else (None, None)

            media = MessageMedia.objects.create(
                message=message,
                file=file,
                file_name=getattr(file, 'name', None),
                file_size=getattr(file, 'size', None),
                mime_type=mime_type
            )
            media_objects.append(media)
        
        # Clear unread count cache for all participants
        for participant in chat.participants.all():
            cache.delete(f'unread_counts_{participant.id}')
        
        # Return complete message with media
        response_serializer = self.get_serializer(message)
        response_data = response_serializer.data
        response_data['media'] = MessageMediaSerializer(
            media_objects, 
            many=True, 
            context={'request': request}
        ).data
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class MediaUploadView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageMediaSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request, *args, **kwargs):
        try:
            # Create a message first if message_id not provided
            if not request.data.get('message'):
                chat_id = request.data.get('chat_id')
                if not chat_id:
                    return Response(
                        {"error": "Either message or chat_id is required"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    chat = Chat.objects.get(id=chat_id, is_active=True)
                    
                    # Check if user is participant
                    if not chat.participants.filter(id=request.user.id).exists():
                        raise PermissionDenied("Not a participant in this chat")
                    
                    # Determine message type from file
                    file = request.FILES.get('file')
                    if not file:
                        return Response({"error": "file is required"}, 
                                      status=status.HTTP_400_BAD_REQUEST)
                    
                    # Validate file size
                    if file.size > 50 * 1024 * 1024:
                        return Response({"error": "File exceeds 50MB limit"}, 
                                      status=status.HTTP_400_BAD_REQUEST)
                    
                    message_type = 'file'
                    mime_type, _ = mimetypes.guess_type(file.name)
                    if mime_type:
                        if mime_type.startswith('image/'):
                            message_type = 'image'
                        elif mime_type.startswith('video/'):
                            message_type = 'video'
                        elif mime_type.startswith('audio/'):
                            message_type = 'audio'
                    
                    # Create message
                    message = Message.objects.create(
                        chat=chat,
                        sender=request.user,
                        message_type=message_type,
                        text=file.name
                    )
                    request.data['message'] = message.id
                except Chat.DoesNotExist:
                    return Response({"error": "Chat not found"}, 
                                  status=status.HTTP_404_NOT_FOUND)
            
            return super().create(request, *args, **kwargs)
        except Exception as e:
            if hasattr(e, 'detail'):
                if isinstance(e.detail, dict):
                    error_messages = []
                    for field, errors in e.detail.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {err}" for err in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    return Response({"error": ". ".join(error_messages)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        return Message.objects.filter(
            chat__participants=self.request.user,
            chat__is_active=True
        ).select_related('sender', 'reply_to').prefetch_related(
            'media', 'reactions__user', 'statuses__user'
        )
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_destroy(self, instance):
        # Soft delete
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()
        
        # Clear unread count cache
        for participant in instance.chat.participants.all():
            cache.delete(f'unread_counts_{participant.id}')


class MessageReactionView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageReactionSerializer
    
    def create(self, request, *args, **kwargs):
        message_id = self.kwargs.get('message_id')
        
        try:
            message = Message.objects.get(
                id=message_id,
                chat__participants=request.user,
                chat__is_active=True,
                is_deleted=False
            )
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        data = request.data.copy()
        data['message'] = message.id
        data['user'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RemoveMessageReactionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, message_id, emoji):
        try:
            reaction = MessageReaction.objects.get(
                message_id=message_id,
                user=request.user,
                emoji=emoji
            )
            reaction.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except MessageReaction.DoesNotExist:
            return Response({"error": "Reaction not found"}, 
                          status=status.HTTP_404_NOT_FOUND)


class ForwardMessageView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, message_id):
        target_chat_id = request.data.get('target_chat_id')
        
        if not target_chat_id:
            return Response({"error": "target_chat_id is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            original_message = Message.objects.get(
                id=message_id,
                chat__participants=request.user,
                is_deleted=False
            )
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        try:
            target_chat = Chat.objects.get(
                id=target_chat_id,
                participants=request.user,
                is_active=True
            )
        except Chat.DoesNotExist:
            return Response({"error": "Target chat not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Create forwarded message
        forwarded_message = Message.objects.create(
            chat=target_chat,
            sender=request.user,
            message_type=original_message.message_type,
            text=original_message.text,
            is_forwarded=True,
            latitude=original_message.latitude,
            longitude=original_message.longitude,
            location_name=original_message.location_name
        )
        
        # Copy media if any
        for media in original_message.media.all():
            MessageMedia.objects.create(
                message=forwarded_message,
                file=media.file,
                file_name=media.file_name,
                file_size=media.file_size,
                mime_type=media.mime_type,
                duration=media.duration,
                width=media.width,
                height=media.height,
                thumbnail=media.thumbnail
            )
        
        # Clear unread count cache for target chat participants
        for participant in target_chat.participants.all():
            cache.delete(f'unread_counts_{participant.id}')
        
        serializer = MessageSerializer(forwarded_message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MarkAllAsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        chat_id = request.data.get('chat_id')
        if not chat_id:
            return Response({"error": "chat_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        chat = get_object_or_404(Chat, id=chat_id, is_active=True)
        if not chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")

        before = timezone.now()
        updated = MessageStatus.objects.filter(
            message__chat=chat,
            user=request.user,
            status__in=['sent', 'delivered']
        ).update(status='read', read_at=before)

        cache.delete(f'unread_counts_{request.user.id}')
        return Response({"count": updated})


class MarkMessageAsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(
            Message,
            id=message_id,
            chat__participants=request.user,
            chat__is_active=True,
            is_deleted=False
        )

        status_obj, _ = MessageStatus.objects.get_or_create(
            message=message,
            user=request.user,
            defaults={'status': 'read', 'read_at': timezone.now()}
        )

        if status_obj.status != 'read':
            status_obj.status = 'read'
            status_obj.read_at = timezone.now()
            status_obj.save(update_fields=['status', 'read_at', 'updated_at'])

        cache.delete(f'unread_counts_{request.user.id}')
        return Response({"status": "read"})


class MessageSearchView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = StandardPagination

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Message.objects.none()

        queryset = Message.objects.filter(
            chat__participants=self.request.user,
            chat__is_active=True,
            is_deleted=False
        ).filter(
            Q(text__icontains=query)
        ).select_related('sender', 'reply_to').prefetch_related('media', 'reactions__user', 'statuses__user')

        chat_id = self.request.query_params.get('chat_id')
        if chat_id:
            queryset = queryset.filter(chat_id=chat_id)

        return queryset.order_by('-created_at')


class MediaInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, media_id):
        media = get_object_or_404(
            MessageMedia,
            id=media_id,
            message__chat__participants=request.user,
            message__chat__is_active=True
        )
        serializer = MessageMediaSerializer(media, context={'request': request})
        return Response(serializer.data)


class MediaDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, media_id):
        media = get_object_or_404(
            MessageMedia,
            id=media_id,
            message__chat__participants=request.user,
            message__chat__is_active=True
        )
        if not media.file:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

        download_url = request.build_absolute_uri(media.file.url)
        return Response({"download_url": download_url})


class ChatMediaView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageMediaSerializer
    pagination_class = StandardPagination

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        chat_id = self.kwargs.get('chat_id')
        chat = get_object_or_404(Chat, id=chat_id, is_active=True)
        if not chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")

        return MessageMedia.objects.filter(
            message__chat=chat,
            message__is_deleted=False
        ).select_related('message').order_by('-uploaded_at')


# ========== CALL VIEWS ==========
class CallListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallSerializer
    
    def get_queryset(self):
        return Call.objects.filter(
            chat__participants=self.request.user
        ).select_related(
            'chat', 'initiated_by'
        ).prefetch_related(
            Prefetch('participants', queryset=CallParticipant.objects.select_related('user'))
        ).order_by('-started_at')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        serializer.save(initiated_by=self.request.user)


class CallDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallSerializer
    
    def get_queryset(self):
        return Call.objects.filter(
            chat__participants=self.request.user
        ).select_related('chat', 'initiated_by').prefetch_related(
            Prefetch('participants', queryset=CallParticipant.objects.select_related('user'))
        )
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class JoinCallView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({"error": "Call not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        if call.status not in ['initiated', 'ongoing']:
            return Response({"error": "Call is not active"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is already a participant
        existing_participant = call.participants.filter(user=request.user).first()
        if existing_participant:
            # User rejoining
            if existing_participant.left_at:
                existing_participant.left_at = None
                existing_participant.save()
            
            serializer = CallParticipantSerializer(
                existing_participant, 
                context={'request': request}
            )
            return Response(serializer.data)
        
        # Create new participant
        participant = CallParticipant.objects.create(
            call=call,
            user=request.user,
            role='participant',
            is_video_enabled=request.data.get('enable_video', True)
        )
        
        # Update call status if first participant joining initiated call
        if call.status == 'initiated' and call.participants.count() > 1:
            call.status = 'ongoing'
            call.save()
        
        serializer = CallParticipantSerializer(participant, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LeaveCallView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({"error": "Call not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        try:
            participant = call.participants.get(user=request.user)
            participant.leave_call()
            
            # If no active participants left, end the call
            active_count = call.participants.filter(left_at__isnull=True).count()
            if active_count == 0:
                call.status = 'completed'
                call.ended_at = timezone.now()
                call.save()
            
            return Response({"status": "left_call"})
            
        except CallParticipant.DoesNotExist:
            return Response({"error": "Not a participant in this call"}, 
                          status=status.HTTP_400_BAD_REQUEST)


class EndCallView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({"error": "Call not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Only initiator or chat admin can end call
        if call.initiated_by != request.user and call.chat.admin != request.user:
            raise PermissionDenied("Only call initiator or chat admin can end call")
        
        call.end_call('completed')
        serializer = CallSerializer(call, context={'request': request})
        return Response(serializer.data)


class ToggleMuteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({"error": "Call not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        try:
            participant = call.participants.get(user=request.user)
            participant.toggle_mute()
            
            serializer = CallParticipantSerializer(participant, context={'request': request})
            return Response(serializer.data)
            
        except CallParticipant.DoesNotExist:
            return Response({"error": "Not a participant in this call"}, 
                          status=status.HTTP_400_BAD_REQUEST)


class ToggleVideoView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({"error": "Call not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        if call.call_type != 'video':
            return Response({"error": "This is not a video call"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            participant = call.participants.get(user=request.user)
            participant.toggle_video()
            
            serializer = CallParticipantSerializer(participant, context={'request': request})
            return Response(serializer.data)
            
        except CallParticipant.DoesNotExist:
            return Response({"error": "Not a participant in this call"}, 
                          status=status.HTTP_400_BAD_REQUEST)


class CallParticipantsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallParticipantSerializer
    
    def get_queryset(self):
        call_id = self.kwargs.get('call_id')
        call = get_object_or_404(Call, id=call_id)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        return call.participants.select_related('user').all()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class ActiveCallsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallSerializer
    
    def get_queryset(self):
        return Call.objects.filter(
            chat__participants=self.request.user,
            status='ongoing'
        ).select_related('chat', 'initiated_by').prefetch_related('participants')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class LogCallQualityView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallQualitySerializer
    
    def create(self, request, *args, **kwargs):
        call_id = self.kwargs.get('call_id')
        call = get_object_or_404(Call, id=call_id)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        try:
            participant = call.participants.get(user=request.user)
        except CallParticipant.DoesNotExist:
            participant = None
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        quality_log = serializer.save(
            call=call,
            participant=participant
        )
        
        return Response(
            CallQualitySerializer(quality_log).data, 
            status=status.HTTP_201_CREATED
        )


class CallQualityLogsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallQualitySerializer
    
    def get_queryset(self):
        call_id = self.kwargs.get('call_id')
        call = get_object_or_404(Call, id=call_id)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        return CallQuality.objects.filter(call=call).select_related('participant').order_by('-measured_at')


class CallQualityReportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, call_id):
        call = get_object_or_404(Call, id=call_id)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        report = CallQuality.quality_report(call.id)
        if not report:
            return Response({"error": "No quality data available"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        return Response(report)


# ========== STATISTICS VIEW ==========
class UserStatisticsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Check cache
        cache_key = f'user_stats_{user.id}'
        cached_stats = cache.get(cache_key)
        
        if cached_stats:
            return Response(cached_stats)
        
        # Message statistics (optimized with single query)
        message_stats = Message.objects.filter(sender=user).aggregate(
            total=models.Count('id'),
            sent_today=models.Count('id', filter=models.Q(created_at__date=timezone.now().date())),
            recent_week=models.Count('id', filter=models.Q(
                created_at__gte=timezone.now() - timedelta(days=7)
            ))
        )
        
        # Chat statistics
        chat_stats = Chat.objects.filter(participants=user, is_active=True).aggregate(
            total=models.Count('id'),
            group=models.Count('id', filter=models.Q(chat_type='group'))
        )
        chat_stats['private'] = (chat_stats['total'] or 0) - (chat_stats['group'] or 0)
        
        # Call statistics
        call_stats = Call.objects.filter(chat__participants=user).aggregate(
            total=models.Count('id'),
            total_duration=models.Sum('call_duration')
        )
        total_duration = call_stats['total_duration'] or 0
        
        response_data = {
            'user': {
                'username': user.username,
                'date_joined': user.date_joined,
                'last_login': user.last_login,
                'last_seen': user.last_seen,
                'is_online': user.is_online
            },
            'messages': {
                'total': message_stats['total'] or 0,
                'sent_today': message_stats['sent_today'] or 0,
                'recent_week': message_stats['recent_week'] or 0
            },
            'chats': {
                'total': chat_stats['total'] or 0,
                'private': chat_stats['private'] or 0,
                'group': chat_stats['group'] or 0
            },
            'calls': {
                'total': call_stats['total'] or 0,
                'total_duration_seconds': total_duration,
                'total_duration_hours': round(total_duration / 3600, 2) if total_duration else 0
            }
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, response_data, 300)
        
        return Response(response_data)


# ========== HEALTH CHECK VIEW ==========
class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Check database connection
        db_status = 'connected'
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception as e:
            db_status = f'error: {str(e)}'
            logger.error(f"Database health check failed: {str(e)}")
        
        # Check cache
        cache_status = 'connected'
        try:
            cache.set('health_check', 'ok', 1)
            if cache.get('health_check') != 'ok':
                cache_status = 'error: cache read/write mismatch'
        except Exception as e:
            cache_status = f'error: {str(e)}'
            logger.error(f"Cache health check failed: {str(e)}")
        
        # Check disk space
        disk_status = 'ok'
        if PSUTIL_AVAILABLE:
            try:
                disk_usage = psutil.disk_usage('/')
                disk_percent = disk_usage.percent
                if disk_percent > 90:
                    disk_status = f'warning: {disk_percent}% used'
                else:
                    disk_status = f'{disk_percent}% used'
            except Exception as e:
                disk_status = f'error: {str(e)}'
                logger.error(f"Disk health check failed: {str(e)}")
        else:
            disk_status = 'unavailable (install psutil for disk monitoring)'
        
        return Response({
            'status': 'healthy' if db_status == 'connected' else 'unhealthy',
            'timestamp': timezone.now(),
            'database': db_status,
            'cache': cache_status,
            'disk': disk_status,
            'version': '1.0.0'
        })


class ContactViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user contacts"""
    permission_classes = [IsAuthenticated]
    serializer_class = ContactSerializer
    
    def get_queryset(self):
        return Contact.objects.filter(user=self.request.user).select_related('contact').distinct()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        serializer = AddContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        contact_id = serializer.validated_data['contact_id']
        
        # Prevent adding self as contact
        if contact_id == request.user.id:
            return Response(
                {'error': 'Cannot add yourself as a contact'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if contact already exists
        if Contact.objects.filter(user=request.user, contact_id=contact_id).exists():
            return Response(
                {'error': 'Contact already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create mutual contact relationship
        # Create contact for current user (request.user adds contact_id)
        contact = Contact.objects.create(user=request.user, contact_id=contact_id)
        
        # Create reverse contact for the other user (contact_id adds request.user)
        Contact.objects.get_or_create(user_id=contact_id, contact_id=request.user.id)
        
        serializer = ContactSerializer(contact, context={'request': request})
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        contact_id = kwargs.get('pk')
        
        try:
            contact = Contact.objects.get(user=request.user, contact_id=contact_id)
            contact.delete()
            
            # Also remove the reverse contact relationship
            Contact.objects.filter(user_id=contact_id, contact_id=request.user.id).delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Contact.DoesNotExist:
            return Response(
                {'error': 'Contact not found'},
                status=status.HTTP_404_NOT_FOUND
            )