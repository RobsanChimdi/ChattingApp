from rest_framework import serializers
from django.utils import timezone
from django.core.exceptions import ValidationError
import os
import mimetypes
from django.contrib.auth.password_validation import validate_password
from .models import User, Chat, Message, MessageMedia, MessageStatus, MessageReaction, Call, CallParticipant, CallQuality


# ========== USER SERIALIZERS ==========
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password", "confirm_password",
            "first_name", "last_name", "profile_image", "bio", "phone_number",
            "status", "privacy_last_seen", "is_verified", "last_seen", "is_online"
        ]
        read_only_fields = ["is_verified", "last_seen", "is_online"]
        extra_kwargs = {
            'profile_image': {'required': False, 'allow_null': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            bio=validated_data.get('bio', ''),
            phone_number=validated_data.get('phone_number', ''),
            status=validated_data.get('status', 'Hey there! I\'m using ChatApp'),
            privacy_last_seen=validated_data.get('privacy_last_seen', 'everyone')
        )
        user.generate_verification_code()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "display_name",
            "profile_image", "profile_image_url", "bio", "phone_number", "status",
            "privacy_last_seen", "last_seen", "is_online", "is_verified"
        ]
        read_only_fields = ["last_seen", "is_online", "is_verified", "email"]
        extra_kwargs = {
            'profile_image': {'write_only': True, 'required': False, 'allow_null': True}
        }
    
    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None
    
    def get_display_name(self, obj):
        return obj.get_display_name()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class RegisterSerializer(UserSerializer):
    """Alias for UserSerializer for registration"""
    pass


class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    verification_code = serializers.CharField(max_length=6)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetSerializer(serializers.Serializer):
    reset_token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs


class WebSocketTokenSerializer(serializers.Serializer):
    """Serializer for WebSocket token response"""
    token = serializers.CharField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)


# ========== MESSAGE MEDIA SERIALIZER ==========
class MessageMediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField(read_only=True)
    formatted_size = serializers.SerializerMethodField(read_only=True)
    file_type = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MessageMedia
        fields = [
            'id', 'message', 'file', 'file_name', 'file_size', 'formatted_size',
            'mime_type', 'file_type', 'duration', 'width', 'height', 'thumbnail',
            'url', 'thumbnail_url', 'uploaded_at'
        ]
        read_only_fields = [
            'file_name', 'file_size', 'mime_type', 'duration',
            'width', 'height', 'uploaded_at', 'formatted_size', 'file_type'
        ]
        extra_kwargs = {
            'message': {'write_only': True, 'required': True},
            'file': {'required': True}
        }
    
    def get_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None
    
    def get_formatted_size(self, obj):
        return obj.formatted_size
    
    def get_file_type(self, obj):
        if obj.mime_type:
            if obj.mime_type.startswith('image/'):
                return 'image'
            elif obj.mime_type.startswith('video/'):
                return 'video'
            elif obj.mime_type.startswith('audio/'):
                return 'audio'
            else:
                return 'document'
        return 'unknown'
    
    def validate_file(self, value):
        # Check file size (max 50MB)
        max_size = 50 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size cannot exceed {max_size / (1024 * 1024)}MB"
            )
        
        # Auto-detect mime type
        mime_type, _ = mimetypes.guess_type(value.name)
        
        # Define valid extensions (lowercase for comparison)
        valid_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', 
                           '.mp3', '.wav', '.pdf', '.doc', '.docx', '.txt')
        
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in valid_extensions:
            raise serializers.ValidationError(
                f"Unsupported file type. Allowed: {', '.join(valid_extensions)}"
            )
        
        return value


# ========== MESSAGE STATUS SERIALIZER ==========
class MessageStatusSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MessageStatus
        fields = [
            'id', 'message', 'user', 'user_info', 'status',
            'delivered_at', 'read_at', 'updated_at'
        ]
        read_only_fields = ['updated_at', 'delivered_at', 'read_at']
        extra_kwargs = {
            'message': {'write_only': True},
            'user': {'write_only': True}
        }
    
    def get_user_info(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'display_name': obj.user.get_display_name(),
            'profile_image': obj.user.profile_image.url if obj.user.profile_image else None
        }
    
    def validate(self, data):
        message = data.get('message')
        user = data.get('user')
        
        if message and user and not message.chat.participants.filter(id=user.id).exists():
            raise serializers.ValidationError(
                "User must be a participant in the chat."
            )
        
        if self.instance:
            current_status = self.instance.status
            new_status = data.get('status', current_status)
            
            valid_transitions = {
                'sent': ['delivered', 'failed'],
                'delivered': ['read', 'failed'],
                'read': [],
                'failed': ['sent']
            }
            
            if new_status != current_status and new_status not in valid_transitions.get(current_status, []):
                raise serializers.ValidationError(
                    f"Cannot transition from {current_status} to {new_status}"
                )
        
        return data


# ========== MESSAGE REACTION SERIALIZER ==========
class MessageReactionSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'message', 'user', 'user_info', 'emoji', 'reacted_at']
        read_only_fields = ['reacted_at']
        extra_kwargs = {
            'message': {'write_only': True},
            'user': {'write_only': True}
        }
    
    def get_user_info(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'display_name': obj.user.get_display_name(),
            'profile_image': obj.user.profile_image.url if obj.user.profile_image else None
        }
    
    def validate(self, data):
        message = data.get('message')
        user = data.get('user')
        
        if message and user and not message.chat.participants.filter(id=user.id).exists():
            raise serializers.ValidationError(
                "User must be a participant in the chat."
            )
        
        return data
    
    def create(self, validated_data):
        message = validated_data['message']
        user = validated_data['user']
        emoji = validated_data['emoji']
        
        reaction, created = MessageReaction.objects.update_or_create(
            message=message,
            user=user,
            defaults={'emoji': emoji}
        )
        
        return reaction


# ========== MESSAGE SUMMARY SERIALIZER ==========
class MessageSummarySerializer(serializers.ModelSerializer):
    """Serializer for message preview/summary"""
    sender_info = serializers.SerializerMethodField()
    reply_to_info = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()
    reactions_summary = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender_info', 'message_type', 'text', 'summary',
            'is_edited', 'is_forwarded', 'is_deleted', 'created_at',
            'reply_to_info', 'media_count', 'reactions_summary'
        ]
    
    def get_sender_info(self, obj):
        return {
            'id': obj.sender.id,
            'username': obj.sender.username,
            'display_name': obj.sender.get_display_name(),
            'profile_image': obj.sender.profile_image.url if obj.sender.profile_image else None
        }
    
    def get_reply_to_info(self, obj):
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender': obj.reply_to.sender.username,
                'message_type': obj.reply_to.message_type,
                'summary': self._get_message_summary(obj.reply_to)
            }
        return None
    
    def get_media_count(self, obj):
        return obj.media.count()
    
    def get_reactions_summary(self, obj):
        return obj.reaction_summary
    
    def get_summary(self, obj):
        return self._get_message_summary(obj)
    
    def _get_message_summary(self, obj):
        if obj.is_deleted:
            return "This message was deleted"
        if obj.message_type == 'text':
            return obj.text[:100] + '...' if obj.text and len(obj.text) > 100 else obj.text
        elif obj.message_type == 'image':
            return "📷 Image"
        elif obj.message_type == 'video':
            return "🎥 Video"
        elif obj.message_type == 'audio':
            return "🎵 Audio"
        elif obj.message_type == 'location':
            return "📍 Location"
        else:
            return "📎 File"


# ========== MESSAGE SERIALIZER ==========
class MessageSerializer(serializers.ModelSerializer):
    sender_info = serializers.SerializerMethodField(read_only=True)
    chat_info = serializers.SerializerMethodField(read_only=True)
    media = MessageMediaSerializer(many=True, read_only=True)
    statuses = MessageStatusSerializer(many=True, read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    reply_to_info = serializers.SerializerMethodField(read_only=True)
    location_data = serializers.SerializerMethodField(read_only=True)
    status_summary = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'client_message_id', 'chat', 'chat_info', 'sender', 'sender_info',
            'message_type', 'text', 'created_at', 'updated_at', 'is_edited',
            'is_forwarded', 'is_deleted', 'deleted_at', 'deleted_by',
            'reply_to', 'reply_to_info', 'latitude', 'longitude', 'location_name',
            'location_data', 'media', 'statuses', 'reactions', 'status_summary'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'is_edited', 'is_forwarded',
            'is_deleted', 'deleted_at', 'deleted_by'
        ]
        extra_kwargs = {
            'client_message_id': {'required': False},
            'sender': {'write_only': True},
            'chat': {'required': True},
            'reply_to': {'required': False, 'allow_null': True}
        }
    
    def get_sender_info(self, obj):
        return {
            'id': obj.sender.id,
            'username': obj.sender.username,
            'display_name': obj.sender.get_display_name(),
            'profile_image': obj.sender.profile_image.url if obj.sender.profile_image else None
        }
    
    def get_chat_info(self, obj):
        return {
            'id': obj.chat.id,
            'name': getattr(obj.chat, 'name', None),
            'chat_type': obj.chat.chat_type
        }
    
    def get_reply_to_info(self, obj):
        if obj.reply_to:
            return MessageSummarySerializer(obj.reply_to, context=self.context).data
        return None
    
    def get_location_data(self, obj):
        if obj.message_type == 'location' and obj.latitude and obj.longitude:
            return {
                'latitude': float(obj.latitude),
                'longitude': float(obj.longitude),
                'location_name': obj.location_name
            }
        return None
    
    def get_status_summary(self, obj):
        return obj.status_summary
    
    def validate(self, data):
        chat = data.get('chat')
        sender = data.get('sender')
        message_type = data.get('message_type', 'text')
        text = data.get('text', '')
        
        if sender and chat and not chat.participants.filter(id=sender.id).exists():
            raise serializers.ValidationError(
                "Sender must be a participant in the chat."
            )
        
        if message_type == 'text':
            if not text or not text.strip():
                raise serializers.ValidationError({"text": "Text message cannot be empty."})
        elif message_type == 'location':
            if not data.get('latitude') or not data.get('longitude'):
                raise serializers.ValidationError(
                    {"location": "Location messages require latitude and longitude."}
                )
        
        reply_to = data.get('reply_to')
        if reply_to and reply_to.chat != chat:
            raise serializers.ValidationError(
                {"reply_to": "Reply must be to a message in the same chat."}
            )
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and 'sender' not in validated_data:
            validated_data['sender'] = request.user
        
        message = Message.objects.create(**validated_data)
        
        # Create status for all participants except sender
        chat_participants = message.chat.participants.exclude(id=message.sender.id)
        for participant in chat_participants:
            MessageStatus.objects.create(
                message=message,
                user=participant,
                status='sent'
            )
        
        return message


# ========== CHAT SERIALIZERS ==========
class ChatListSerializer(serializers.ModelSerializer):
    """Serializer for chat lists (lightweight version)"""
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participants_info = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    display_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = [
            'id', 'chat_type', 'name', 'display_name', 'image', 'display_image',
            'description', 'updated_at', 'last_message', 'unread_count', 
            'participants_info'
        ]
    
    def get_display_name(self, obj):
        """Get display name (for private chats, show other participant's name)"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.name
        
        if obj.chat_type == 'private':
            other_user = obj.participants.exclude(id=request.user.id).first()
            if other_user:
                return other_user.get_display_name()
        return obj.name
    
    def get_display_image(self, obj):
        """Get display image (for private chats, show other participant's image)"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.image.url if obj.image else None
        
        if obj.chat_type == 'private':
            other_user = obj.participants.exclude(id=request.user.id).first()
            if other_user and other_user.profile_image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(other_user.profile_image.url)
                return other_user.profile_image.url
        
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_last_message(self, obj):
        last_msg = obj.messages.filter(is_deleted=False).first()
        if last_msg:
            return {
                'id': last_msg.id,
                'sender': last_msg.sender.username,
                'message_type': last_msg.message_type,
                'summary': last_msg.get_summary(),
                'created_at': last_msg.created_at,
                'is_edited': last_msg.is_edited
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.unread_count(request.user)
        return 0
    
    def get_participants_info(self, obj):
        participants = obj.participants.all()
        return [{
            'id': user.id,
            'username': user.username,
            'display_name': user.get_display_name(),
            'profile_image': user.profile_image.url if user.profile_image else None,
            'is_online': user.is_online,
            'last_seen': user.last_seen
        } for user in participants]


class ChatSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, required=False
    )
    participants_info = serializers.SerializerMethodField(read_only=True)
    last_message = serializers.SerializerMethodField(read_only=True)
    admin_info = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Chat
        fields = [
            'id', 'chat_type', 'name', 'description', 'image',
            'participants', 'participants_info', 'admin', 'admin_info',
            'created_at', 'updated_at', 'is_active', 'last_message'
        ]
        read_only_fields = ['created_at', 'updated_at', 'admin', 'is_active']
        extra_kwargs = {
            'image': {'required': False, 'allow_null': True}
        }
    
    def validate(self, data):
        chat_type = data.get('chat_type', getattr(self.instance, 'chat_type', None))
        participants = data.get('participants', [])
        
        if not participants and self.instance:
            participants = list(self.instance.participants.all())
        
        if chat_type == 'private':
            if len(participants) != 2:
                raise serializers.ValidationError(
                    {"participants": "Private chats must have exactly 2 participants."}
                )
            if data.get('name'):
                raise serializers.ValidationError(
                    {"name": "Private chats should not have a name."}
                )
        elif chat_type == 'group':
            if len(participants) < 2:
                raise serializers.ValidationError(
                    {"participants": "Group chats must have at least 2 participants."}
                )
            if not data.get('name') and not self.instance:
                raise serializers.ValidationError(
                    {"name": "Group chats must have a name."}
                )
        
        for participant in participants:
            if not participant.is_active:
                raise serializers.ValidationError(
                    f"User {participant.username} is not active."
                )
        
        return data
    
    def create(self, validated_data):
        participants = validated_data.pop('participants', [])
        chat = Chat.objects.create(**validated_data)
        
        if participants:
            chat.participants.set(participants)
        
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            chat.participants.add(request.user)
            if chat.chat_type == 'group':
                chat.admin = request.user
                chat.save()
        
        return chat
    
    def update(self, instance, validated_data):
        participants = validated_data.pop('participants', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if participants is not None:
            instance.participants.set(participants)
        
        return instance
    
    def get_participants_info(self, obj):
        participants = obj.participants.all()
        return [{
            'id': user.id,
            'username': user.username,
            'display_name': user.get_display_name(),
            'profile_image': user.profile_image.url if user.profile_image else None,
            'is_online': user.is_online,
            'last_seen': user.last_seen
        } for user in participants]
    
    def get_last_message(self, obj):
        last_msg = obj.messages.filter(is_deleted=False).first()
        if last_msg:
            return MessageSummarySerializer(last_msg, context=self.context).data
        return None
    
    def get_admin_info(self, obj):
        if obj.admin:
            return {
                'id': obj.admin.id,
                'username': obj.admin.username,
                'display_name': obj.admin.get_display_name(),
                'profile_image': obj.admin.profile_image.url if obj.admin.profile_image else None
            }
        return None


class ChatUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating chat info (limited fields)"""
    class Meta:
        model = Chat
        fields = ['name', 'description', 'image']
        extra_kwargs = {
            'name': {'required': False},
            'description': {'required': False, 'allow_blank': True},
            'image': {'required': False, 'allow_null': True}
        }
    
    def validate_name(self, value):
        if value is not None and len(value) < 1:
            raise serializers.ValidationError("Chat name cannot be empty")
        if value is not None and len(value) > 100:
            raise serializers.ValidationError("Chat name cannot exceed 100 characters")
        return value
    
    def validate_description(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Description cannot exceed 500 characters")
        return value


# ========== CALL PARTICIPANT SERIALIZER ==========
class CallParticipantSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField(read_only=True)
    duration = serializers.SerializerMethodField(read_only=True)
    has_video = serializers.BooleanField(source='is_video_enabled', read_only=True)
    is_speaking = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CallParticipant
        fields = [
            'id', 'call', 'user', 'user_info', 'joined_at', 'left_at',
            'is_muted', 'is_video_enabled', 'has_video', 'is_speaking',
            'role', 'duration'
        ]
        read_only_fields = ['joined_at', 'left_at', 'duration', 'is_speaking']
        extra_kwargs = {
            'call': {'write_only': True},
            'user': {'write_only': True}
        }
    
    def get_user_info(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'display_name': obj.user.get_display_name(),
            'profile_image': obj.user.profile_image.url if obj.user.profile_image else None,
            'is_online': obj.user.is_online,
            'last_seen': obj.user.last_seen
        }
    
    def get_duration(self, obj):
        return obj.duration
    
    def validate(self, data):
        user = data.get('user')
        call = data.get('call')
        
        if user and call and not call.chat.participants.filter(id=user.id).exists():
            raise serializers.ValidationError(
                "User must be a participant in the chat."
            )
        
        return data
    
    def create(self, validated_data):
        participant, created = CallParticipant.objects.get_or_create(
            call=validated_data['call'],
            user=validated_data['user'],
            defaults={
                'role': validated_data.get('role', 'participant'),
                'is_muted': False,
                'is_video_enabled': validated_data.get('is_video_enabled', True)
            }
        )
        
        if not created:
            participant.left_at = None
            participant.is_muted = validated_data.get('is_muted', participant.is_muted)
            participant.is_video_enabled = validated_data.get('is_video_enabled', participant.is_video_enabled)
            participant.role = validated_data.get('role', participant.role)
            participant.save()
        
        return participant


# ========== CALL QUALITY SERIALIZER ==========
class CallQualitySerializer(serializers.ModelSerializer):
    is_good_quality = serializers.BooleanField(read_only=True)
    is_poor_quality = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CallQuality
        fields = [
            'id', 'call', 'participant', 'latency_ms', 'jitter_ms',
            'packet_loss', 'bitrate_kbps', 'audio_bitrate', 'video_bitrate',
            'audio_level', 'quality_status', 'is_good_quality', 'is_poor_quality',
            'measured_at'
        ]
        read_only_fields = ['measured_at', 'quality_status', 'is_good_quality', 'is_poor_quality']
        extra_kwargs = {
            'call': {'write_only': True},
            'participant': {'required': False, 'allow_null': True}
        }
    
    def validate_latency_ms(self, value):
        if value < 0 or value > 10000:
            raise serializers.ValidationError("Latency must be between 0 and 10000 ms.")
        return value
    
    def validate_jitter_ms(self, value):
        if value < 0 or value > 1000:
            raise serializers.ValidationError("Jitter must be between 0 and 1000 ms.")
        return value
    
    def validate_packet_loss(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Packet loss must be between 0 and 100 percent.")
        return value
    
    def validate_bitrate_kbps(self, value):
        if value is not None and (value < 0 or value > 10000):
            raise serializers.ValidationError("Bitrate must be between 0 and 10000 kbps.")
        return value
    
    def validate_audio_level(self, value):
        if value is not None and (value < 0 or value > 1):
            raise serializers.ValidationError("Audio level must be between 0 and 1.")
        return value


# ========== CALL SERIALIZER ==========
from django.db import transaction

class CallSerializer(serializers.ModelSerializer):
    participants = CallParticipantSerializer(many=True, read_only=True)
    quality_logs = CallQualitySerializer(many=True, read_only=True)
    initiated_by_info = serializers.SerializerMethodField(read_only=True)
    chat_info = serializers.SerializerMethodField(read_only=True)
    duration_seconds = serializers.SerializerMethodField(read_only=True)
    participant_count = serializers.SerializerMethodField(read_only=True)
    active_participant_count = serializers.SerializerMethodField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Call
        fields = [
            'id', 'chat', 'chat_info', 'call_type', 'status',
            'started_at', 'ended_at', 'call_duration', 'duration_seconds',
            'initiated_by', 'initiated_by_info', 'is_group_call', 'is_ongoing',
            'participants', 'participant_count', 'active_participant_count',
            'quality_logs'
        ]
        read_only_fields = [
            'started_at', 'ended_at', 'call_duration', 'status',
            'duration_seconds', 'participant_count', 'active_participant_count',
            'is_ongoing'
        ]
        extra_kwargs = {
            'initiated_by': {'write_only': True}
        }
    
    def get_initiated_by_info(self, obj):
        if obj.initiated_by:
            return {
                'id': obj.initiated_by.id,
                'username': obj.initiated_by.username,
                'display_name': obj.initiated_by.get_display_name(),
                'profile_image': obj.initiated_by.profile_image.url if obj.initiated_by.profile_image else None
            }
        return None
    
    def get_chat_info(self, obj):
        return {
            'id': obj.chat.id,
            'name': getattr(obj.chat, 'name', None),
            'chat_type': obj.chat.chat_type
        }
    
    def get_duration_seconds(self, obj):
        return obj.call_duration
    
    def get_participant_count(self, obj):
        return obj.participant_count
    
    def get_active_participant_count(self, obj):
        return obj.active_participant_count
    
    def validate(self, data):
        chat = data.get('chat')
        
        if chat and chat.chat_type == 'private' and chat.participants.count() != 2:
            raise serializers.ValidationError(
                {"chat": "Private chat must have exactly 2 participants for a call."}
            )
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        
        if request and request.user.is_authenticated and 'initiated_by' not in validated_data:
            validated_data['initiated_by'] = request.user
        
        chat = validated_data['chat']
        
        # Check for ongoing call with row lock to prevent race condition
        if Call.objects.filter(chat=chat, status='ongoing').select_for_update().exists():
            raise serializers.ValidationError(
                {"chat": "There is already an ongoing call in this chat."}
            )
        
        call = Call.objects.create(**validated_data)
        
        CallParticipant.objects.create(
            call=call,
            user=validated_data['initiated_by'],
            role='initiator'
        )
        
        return call


class CallUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating call status"""
    class Meta:
        model = Call
        fields = ['status']
    
    def validate_status(self, value):
        if not self.instance:
            return value
        
        valid_transitions = {
            'initiated': ['ongoing', 'missed', 'rejected', 'completed'],
            'ongoing': ['completed'],
            'completed': [],
            'missed': [],
            'rejected': []
        }
        
        current_status = self.instance.status
        if value != current_status and value not in valid_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"Cannot transition from {current_status} to {value}"
            )
        
        return value
    
    def update(self, instance, validated_data):
        new_status = validated_data.get('status')
        
        if new_status == 'completed' and not instance.ended_at:
            instance.end_call('completed')
        else:
            instance.status = new_status
            instance.save()
        
        return instance


class CallJoinSerializer(serializers.Serializer):
    """Serializer for joining a call"""
    user_id = serializers.IntegerField(required=True)
    enable_video = serializers.BooleanField(default=True)
    
    def validate_user_id(self, value):
        try:
            user = User.objects.get(id=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist.")
        
        return user