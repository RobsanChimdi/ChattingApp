# views.py
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Prefetch
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.cache import cache
from django.db import transaction
import secrets
from django.conf import settings

from rest_framework import viewsets, generics, status, permissions, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import SearchFilter, OrderingFilter

# Add these imports at the top of views.py
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import uuid
from django.core.mail import send_mail
from django.contrib.auth.password_validation import validate_password

from .models import (
    User, Chat, Message, MessageMedia, MessageStatus, 
    MessageReaction, Call, CallParticipant, CallQuality
)
from .serializers import (
    UserSerializer, UserProfileSerializer, ChatSerializer, ChatUpdateSerializer, 
    ChatListSerializer, MessageSerializer, MessageMediaSerializer,
    MessageStatusSerializer, MessageReactionSerializer, CallSerializer,
    CallParticipantSerializer, CallQualitySerializer, CallUpdateSerializer,
    MessageSummarySerializer, CallJoinSerializer
)

# Define a standard pagination class
class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ========== AUTHENTICATION VIEWS ==========
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserSerializer
    
    def create(self, request, *args, **kwargs):
        from django.contrib.auth import authenticate
        from rest_framework.authtoken.models import Token
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save(is_verified=False)
        otp = ''.join(secrets.choice("0123456789") for _ in range(6))
        user.verification_code==otp
        user.verification_code_created_at = timezone.now()
        user.save()

        send_mail(
                subject="Your OTP Code",
                message=f"Your verification code is: {otp}",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[user.email],  # replace with user email
                fail_silently=False,
            )
     
        return Response(
            {"message": "User registered. Verification code sent to email."},
            status=status.HTTP_201_CREATED
        )

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('verification_code')
        
        if not email or not code:
            return Response(
                {"error": "Email and verification code are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        if hasattr(user, 'verification_code') and user.verification_code == code:
            if user.verification_code_created_at<timezone.now()-timedelta(minutes=5):
                 return Response({"error": "Code expired"}, status=400)
            user.is_verified = True
            user.verification_code = None
            user.verification_code_created_at = None
            user.save()
            return Response({"status": "verified"})
        else:
            return Response({"error": "Invalid verification code"}, status=400)


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        if user.is_verified:
            return Response({"error": "Email already verified"}, status=400)
        
        # Generate new code
        if hasattr(user, 'generate_verification_code'):
            user.generate_verification_code()
            
            # Send email
            send_mail(
                subject="Verify Your Account",
                message=f"Your verification code is: {user.verification_code}",
                from_email="noreply@yourapp.com",
                recipient_list=[user.email],
                fail_silently=True
            )
            
            return Response({"status": "verification_code_sent"})
        
        return Response({"error": "Verification not available"}, status=400)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return success even if user doesn't exist (security)
            return Response({"status": "reset_email_sent"})
        
        # Generate reset token
        token = uuid.uuid4()
        user.reset_token = token
        user.reset_token_expiry = timezone.now() + timedelta(hours=1)
        user.save()
        
        # Send email
        send_mail(
            subject="Password Reset Request",
            message=f"Your password reset token is: {token}\n\nThis token will expire in 1 hour.",
            from_email="noreply@yourapp.com",
            recipient_list=[user.email],
            fail_silently=True
        )
        
        return Response({"status": "reset_email_sent"})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('reset_token')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        if not token or not new_password or not confirm_password:
            return Response(
                {"error": "Token, new password, and confirm password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_password != confirm_password:
            return Response(
                {"error": "Passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(
                reset_token=token, 
                reset_token_expiry__gte=timezone.now()
            )
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"error": e.messages}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        user.save()
        
        return Response({"status": "password_reset_success"})
    
class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        from django.contrib.auth import authenticate
        from rest_framework.authtoken.models import Token
        
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Update last seen
        user.update_last_seen()
        
        # Create or get token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from rest_framework.authtoken.models import Token
        
        # Mark user as offline
        request.user.set_offline()
        
        # Delete token
        try:
            token = Token.objects.get(user=request.user)
            token.delete()
        except Token.DoesNotExist:
            pass
        
        return Response({'status': 'logged_out'})


class WebSocketTokenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from rest_framework.authtoken.models import Token
        
        token, created = Token.objects.get_or_create(user=request.user)
        return Response({
            'token': token.key,
            'user_id': request.user.id,
            'username': request.user.username
        })


# ========== USER VIEWS ==========
class CurrentUserView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user

class UpdateProfileView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # ✅ Add parsers
    
    def get_object(self):
        return self.request.user
    
    def perform_update(self, serializer):
        # Handle profile image upload properly
        profile_image = self.request.FILES.get('profile_image')
        if profile_image:
            # Delete old profile image if exists
            if self.request.user.profile_image:
                self.request.user.profile_image.delete(save=False)
        
        serializer.save()

class UserSearchView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    pagination_class = StandardPagination
    filter_backends = [SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        if not query or len(query) < 2:
            return User.objects.none()
        
        return User.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).exclude(id=self.request.user.id).filter(is_active=True)


class UserOnlineStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check privacy settings
        if user.privacy_last_seen == 'nobody' and user != request.user:
            return Response({
                'is_online': user.is_online,
                'privacy': 'hidden'
            })
        
        elif user.privacy_last_seen == 'contacts' and user != request.user:
            # Check if users have a chat together
            has_chat = Chat.objects.filter(
                chat_type='private'
            ).filter(
                participants=user
            ).filter(
                participants=request.user
            ).exists()
            
            if not has_chat:
                return Response({
                    'is_online': user.is_online,
                    'privacy': 'contacts_only'
                })
        
        return Response({
            'is_online': user.is_online,
            'last_seen': user.last_seen,
            'status': user.status
        })


class UpdateLastSeenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        request.user.update_last_seen()
        return Response({'status': 'last_seen_updated'})


class SetOfflineView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        request.user.set_offline()
        return Response({'status': 'offline'})


# ========== CHAT VIEWS ==========
class ChatListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatSerializer
    pagination_class = StandardPagination
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ChatListSerializer
        return ChatSerializer
    
    def get_queryset(self):
        return Chat.objects.filter(
            participants=self.request.user,
            is_active=True
        ).prefetch_related('participants').order_by('-updated_at')
    
    def perform_create(self, serializer):
        chat = serializer.save()
        chat.participants.add(self.request.user)


class CreatePrivateChatView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        participant_id = request.data.get('participant_id')
        
        if not participant_id:
            return Response({"error": "participant_id is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            participant = User.objects.get(id=participant_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if private chat already exists
        existing_chat = Chat.objects.filter(
            chat_type='private',
            participants=request.user
        ).filter(participants=participant).first()
        
        if existing_chat:
            serializer = ChatSerializer(existing_chat)
            return Response(serializer.data)
        
        # Create new private chat
        chat = Chat.objects.create(chat_type='private')
        chat.participants.add(request.user, participant)
        
        serializer = ChatSerializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AddParticipantView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant
        if not chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Check if user has permission (admin or creator)
        if chat.admin != request.user and chat.chat_type != 'private':
            raise PermissionDenied("Only admin can add participants")
        
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        try:
            chat.add_participant(user)
            return Response({"status": "participant_added"})
        except ValidationError as e:
            return Response({"error": str(e)}, 
                          status=status.HTTP_400_BAD_REQUEST)


class RemoveParticipantView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant
        if not chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Check if user has permission (admin or creator)
        if chat.admin != request.user:
            raise PermissionDenied("Only admin can remove participants")
        
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        try:
            chat.remove_participant(user)
            return Response({"status": "participant_removed"})
        except ValidationError as e:
            return Response({"error": str(e)}, 
                          status=status.HTTP_400_BAD_REQUEST)


class LeaveChatView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if chat.chat_type == 'private':
            return Response({"error": "Cannot leave private chat"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        chat.participants.remove(request.user)
        
        # If admin leaves and there are other participants, assign new admin
        if chat.admin == request.user and chat.participants.exists():
            new_admin = chat.participants.first()
            chat.admin = new_admin
            chat.save()
        
        return Response({"status": "left_chat"})


class UpdateChatInfoView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatUpdateSerializer  # ✅ Use specialized serializer
    
    def get_object(self):
        chat_id = self.kwargs.get('chat_id')
        chat = get_object_or_404(Chat, id=chat_id)
        
        # Check if user is a participant
        if not chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        if chat.chat_type != 'group':
            raise ValidationError("Only group chats can be updated")
        
        if chat.admin != self.request.user:
            raise PermissionDenied("Only admin can update chat info")
        
        return chat
    
    def update(self, request, *args, **kwargs):
        chat = self.get_object()
        serializer = self.get_serializer(chat, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class ChatMessagesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = StandardPagination
    
    def get_queryset(self):
        chat_id = self.kwargs.get('chat_id')
        chat = get_object_or_404(Chat, id=chat_id)
        
        # Check if user is a participant
        if not chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Mark messages as read
        unread_messages = Message.objects.filter(
            chat=chat,
            statuses__user=self.request.user,
            statuses__status__in=['sent', 'delivered']
        )
        
        for message in unread_messages:
            status_obj = message.statuses.get(user=self.request.user)
            status_obj.mark_as_read()
        
        # Get messages
        return Message.objects.filter(
            chat=chat,
            is_deleted=False
        ).select_related('sender', 'reply_to').prefetch_related(
            'media', 'reactions', 'statuses'
        ).order_by('-created_at')


class UnreadMessageCountView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        chats = Chat.objects.filter(
            participants=request.user,
            is_active=True
        )  
        counts = {}
        
        for chat in chats:
            counts[chat.id] = chat.unread_count(request.user)
        
        return Response(counts)


# ========== MESSAGE VIEWS ==========
class MessageCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
    
    def create(self, request, *args, **kwargs):
        # Handle file uploads if present
        if request.FILES:
            return self._create_with_files(request, *args, **kwargs)
        
        return super().create(request, *args, **kwargs)
    
    def _create_with_files(self, request, *args, **kwargs):
        """Create message with file attachments"""
        data = request.data.copy()
        
        # Create message first
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(sender=request.user)
        
        # Handle file uploads
        files = request.FILES.getlist('files')
        for file in files:
            MessageMedia.objects.create(
                message=message,
                file=file
            )
        
        # Return complete message with media
        serializer = self.get_serializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EditMessageView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_object(self):
        message_id = self.kwargs.get('message_id')
        message = get_object_or_404(Message, id=message_id)
        
        # Check if user is a participant in the chat
        if not message.chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        if message.is_deleted:
            raise ValidationError("Cannot edit deleted message")
        
        if message.sender != self.request.user:
            raise PermissionDenied("Only message owner can edit")
        
        return message
    
    def update(self, request, *args, **kwargs):
        message = self.get_object()
        
        # Only allow text field to be updated
        partial_data = {'text': request.data.get('text')}
        
        if not partial_data['text']:
            return Response({"error": "text is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(message, data=partial_data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Use model's edit_message method
        try:
            message.edit_message(partial_data['text'], request.user)
        except ValueError as e:
            return Response({"error": str(e)}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.data)

class SoftDeleteMessageView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not message.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        if message.is_deleted:
            return Response({"error": "Message already deleted"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        message.soft_delete(request.user)
        return Response({"status": "message_deleted"})


class ReactToMessageView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageReactionSerializer
    
    def create(self, request, *args, **kwargs):
        message_id = self.kwargs.get('message_id')
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not message.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Add message to request data
        data = request.data.copy()
        data['message'] = message.id
        data['user'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        reaction = serializer.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RemoveReactionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not message.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        try:
            reaction = message.reactions.get(user=request.user)
            reaction.delete()
            return Response({"status": "reaction_removed"})
        except MessageReaction.DoesNotExist:
            return Response({"error": "Reaction not found"}, 
                          status=status.HTTP_404_NOT_FOUND)


class ForwardMessageView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not message.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        chat_id = request.data.get('chat_id')
        if not chat_id:
            return Response({"error": "chat_id is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            chat = Chat.objects.get(id=chat_id)
            
            # Check if user is participant in destination chat
            if not chat.participants.filter(id=request.user.id).exists():
                raise PermissionDenied("Not a participant in destination chat")
            
            # Create forwarded message
            forwarded_message = Message.objects.create(
                chat=chat,
                sender=request.user,
                message_type=message.message_type,
                text=message.text,
                is_forwarded=True,
                reply_to=None
            )
            
            # Copy media if any
            for media in message.media.all():
                MessageMedia.objects.create(
                    message=forwarded_message,
                    file=media.file,
                    thumbnail=media.thumbnail,
                    file_name=media.file_name,
                    file_size=media.file_size,
                    mime_type=media.mime_type,
                    duration=media.duration,
                    width=media.width,
                    height=media.height
                )
            
            # Mark original as forwarded
            message.mark_as_forwarded()
            
            serializer = MessageSerializer(forwarded_message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, 
                          status=status.HTTP_404_NOT_FOUND)


class MarkMessageReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not message.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        try:
            status_obj = message.statuses.get(user=request.user)
            status_obj.mark_as_read()
            return Response({"status": "marked_as_read"})
        except MessageStatus.DoesNotExist:
            return Response({"error": "Message status not found"}, 
                          status=status.HTTP_404_NOT_FOUND)


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        chat_id = request.data.get('chat_id')
        if not chat_id:
            return Response({"error": "chat_id is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            chat = Chat.objects.get(id=chat_id)
            
            # Check if user is participant
            if not chat.participants.filter(id=request.user.id).exists():
                raise PermissionDenied("Not a participant in this chat")
            
            # Mark all unread messages as read
            unread_messages = Message.objects.filter(
                chat=chat,
                statuses__user=request.user,
                statuses__status__in=['sent', 'delivered']
            )
            
            for message in unread_messages:
                status_obj = message.statuses.get(user=request.user)
                status_obj.mark_as_read()
            
            return Response({"status": "all_marked_as_read", "count": unread_messages.count()})
            
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found"}, 
                          status=status.HTTP_404_NOT_FOUND)


class SearchMessageView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSummarySerializer
    pagination_class = StandardPagination
    
    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        chat_id = self.request.query_params.get('chat_id')
        
        if not query or len(query) < 2:
            return Message.objects.none()
        
        messages = Message.objects.filter(
            Q(text__icontains=query) &
            Q(chat__participants=self.request.user) &
            Q(is_deleted=False)
        )
        
        if chat_id:
            messages = messages.filter(chat_id=chat_id)
        
        return messages.select_related('sender', 'chat').order_by('-created_at')


# ========== MEDIA VIEWS ==========
class MediaUploadView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageMediaSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request, *args, **kwargs):
        # Create a message first if message_id not provided
        if not request.data.get('message'):
            chat_id = request.data.get('chat_id')
            if not chat_id:
                return Response({"error": "Either message or chat_id is required"}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            try:
                chat = Chat.objects.get(id=chat_id)
                
                # Check if user is participant
                if not chat.participants.filter(id=request.user.id).exists():
                    raise PermissionDenied("Not a participant in this chat")
                
                # Create message
                message = Message.objects.create(
                    chat=chat,
                    sender=request.user,
                    message_type='image'
                )
                request.data['message'] = message.id
                
            except Chat.DoesNotExist:
                return Response({"error": "Chat not found"}, 
                              status=status.HTTP_404_NOT_FOUND)
        
        return super().create(request, *args, **kwargs)


class MediaDownloadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, media_id):
        try:
            media = MessageMedia.objects.get(id=media_id)
        except MessageMedia.DoesNotExist:
            return Response({"error": "Media not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not media.message.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        return Response({
            'url': media.url,
            'download_url': media.download_url,
            'file_name': media.filename
        })


class MediaInfoView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageMediaSerializer
    
    def get_object(self):
        media_id = self.kwargs.get('media_id')
        media = get_object_or_404(MessageMedia, id=media_id)
        
        # Check if user is a participant in the chat
        if not media.message.chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        return media


class ChatMediaView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageMediaSerializer
    pagination_class = StandardPagination
    
    def get_queryset(self):
        chat_id = self.request.query_params.get('chat_id')
        if not chat_id:
            return MessageMedia.objects.none()
        
        try:
            chat = Chat.objects.get(id=chat_id)
            
            # Check if user is participant
            if not chat.participants.filter(id=self.request.user.id).exists():
                raise PermissionDenied("Not a participant in this chat")
            
            return MessageMedia.objects.filter(
                message__chat=chat
            ).select_related('message').order_by('-uploaded_at')
            
        except Chat.DoesNotExist:
            return MessageMedia.objects.none()


# ========== CALL VIEWS ==========
class CallCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallSerializer
    
    def perform_create(self, serializer):
        serializer.save(initiated_by=self.request.user)


class CallDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallSerializer
    
    def get_object(self):
        call_id = self.kwargs.get('call_id')
        call = get_object_or_404(Call, id=call_id)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        return call


class UpdateCallView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallUpdateSerializer
    
    def get_object(self):
        call_id = self.kwargs.get('call_id')
        call = get_object_or_404(Call, id=call_id)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Only initiator or admin can update
        if call.initiated_by != self.request.user and call.chat.admin != self.request.user:
            raise PermissionDenied("Only initiator or admin can update call")
        
        return call


class JoinCallView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({"error": "Call not found"}, status=status.HTTP_404_NOT_FOUND)
        
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
            
            serializer = CallParticipantSerializer(existing_participant)
            return Response(serializer.data)
        
        # Create new participant using CallParticipantSerializer
        participant_data = {
            'call': call.id,
            'user': request.user.id,
            'role': 'participant'
        }
        
        participant_serializer = CallParticipantSerializer(data=participant_data)
        participant_serializer.is_valid(raise_exception=True)
        participant = participant_serializer.save()
        
        # Update call status if first participant joining initiated call
        if call.status == 'initiated' and call.participants.count() > 1:
            call.status = 'ongoing'
            call.save()
        
        return Response(participant_serializer.data, status=status.HTTP_201_CREATED)


class LeaveCallView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({"error": "Call not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        try:
            participant = call.participants.get(user=request.user)
            participant.leave_call()
            
            # If no active participants left, end the call
            if call.active_participant_count == 0:
                call.end_call('completed')
            
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
            return Response({"error": "Call not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        # Only initiator or chat admin can end call
        if call.initiated_by != request.user and call.chat.admin != request.user:
            raise PermissionDenied("Only call initiator or chat admin can end call")
        
        call.end_call('completed')
        serializer = CallSerializer(call)
        return Response(serializer.data)


class ToggleMuteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({"error": "Call not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        try:
            participant = call.participants.get(user=request.user)
            participant.toggle_mute()
            
            serializer = CallParticipantSerializer(participant)
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
            return Response({"error": "Call not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the chat
        if not call.chat.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Not a participant in this chat")
        
        if call.call_type != 'video':
            return Response({"error": "This is not a video call"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            participant = call.participants.get(user=request.user)
            participant.toggle_video()
            
            serializer = CallParticipantSerializer(participant)
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


class ActiveCallsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallSerializer
    
    def get_queryset(self):
        return Call.objects.filter(
            chat__participants=self.request.user,
            status='ongoing'
        ).select_related('chat', 'initiated_by').prefetch_related('participants')


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
        
        return Response(CallQualitySerializer(quality_log).data, 
                      status=status.HTTP_201_CREATED)


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
        
        # Message statistics
        total_messages = Message.objects.filter(sender=user).count()
        sent_today = Message.objects.filter(
            sender=user,
            created_at__date=timezone.now().date()
        ).count()
        
        # Chat statistics
        total_chats = Chat.objects.filter(participants=user, is_active=True).count()
        group_chats = Chat.objects.filter(
            participants=user,
            chat_type='group',
            is_active=True
        ).count()
        private_chats = total_chats - group_chats
        
        # Call statistics
        total_calls = Call.objects.filter(chat__participants=user).count()
        call_duration = Call.objects.filter(
            participants__user=user
        ).aggregate(total_duration=models.Sum('call_duration'))['total_duration'] or 0
        
        # Recent activity
        recent_messages = Message.objects.filter(
            sender=user,
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        ).count()
        
        return Response({
            'user': {
                'username': user.username,
                'date_joined': user.date_joined,
                'last_login': user.last_login,
                'last_seen': user.last_seen,
                'is_online': user.is_online
            },
            'messages': {
                'total': total_messages,
                'sent_today': sent_today,
                'recent_week': recent_messages
            },
            'chats': {
                'total': total_chats,
                'private': private_chats,
                'group': group_chats
            },
            'calls': {
                'total': total_calls,
                'total_duration_seconds': call_duration,
                'total_duration_hours': round(call_duration / 3600, 2) if call_duration else 0
            }
        })


# ========== HEALTH CHECK VIEW ==========
class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        from django.db import connection
        
        # Check database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_status = 'connected'
        except Exception as e:
            db_status = f'error: {str(e)}'
        
        # Check cache
        try:
            cache.set('health_check', 'ok', 1)
            cache_status = 'connected' if cache.get('health_check') == 'ok' else 'error'
        except Exception as e:
            cache_status = f'error: {str(e)}'
        
        return Response({
            'status': 'healthy',
            'timestamp': timezone.now(),
            'database': db_status,
            'cache': cache_status,
            'version': '1.0.0'
        })