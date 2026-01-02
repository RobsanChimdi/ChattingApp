from rest_framework import serializers
from django.utils import timezone
from django.core.exceptions import ValidationError
import os
from .models import User, Chat, Message, MessageMedia, MessageStatus, MessageReaction, Call, CallParticipant, CallQuality


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    last_seen = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'profile_image', 'bio', 'last_seen', 'is_online', 'phone_number',
            'status', 'privacy_last_seen', 'date_joined'
        ]
        read_only_fields = ['date_joined', 'last_login', 'is_online', 'last_seen']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': False}
        }
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("THis email is already inuse")

        return super().validate(value)
    def validate_username(self, value):
        if not value:
            raise serializers.ValidationError("Username cannot be empty.")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        
        return value
    
    def validate_phone_number(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile updates (excluding sensitive fields)"""
    class Meta:
        model = User
        fields = ['profile_image', 'bio', 'status', 'privacy_last_seen', 'phone_number']
    
    def validate_bio(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Bio cannot exceed 500 characters.")
        return value


class ChatListSerializer(serializers.ModelSerializer):
    """Serializer for chat lists (lightweight version)"""
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participants_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = [
            'id', 'chat_type', 'name', 'image', 'description',
            'updated_at', 'last_message', 'unread_count', 'participants_info'
        ]
    
    def get_last_message(self, obj):
        last_msg = obj.messages.filter(is_deleted=False).last()
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
            'profile_image': user.profile_image.url if user.profile_image else None,
            'is_online': user.is_online
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
    
    def validate(self, data):
        chat_type = data.get('chat_type')
        participants = data.get('participants', [])
        
        # If participants not provided, get from instance
        if not participants and self.instance:
            participants = list(self.instance.participants.all())
        
        if chat_type == 'private':
            if len(participants) != 2:
                raise serializers.ValidationError(
                    "Private chats must have exactly 2 participants."
                )
            if data.get('name'):
                raise serializers.ValidationError(
                    "Private chats should not have a name."
                )
        elif chat_type == 'group':
            if len(participants) < 2:
                raise serializers.ValidationError(
                    "Group chats must have at least 2 participants."
                )
            if not data.get('name'):
                raise serializers.ValidationError(
                    "Group chats must have a name."
                )
        
        # Check if participants exist and are active
        for participant in participants:
            if not participant.is_active:
                raise serializers.ValidationError(
                    f"User {participant.username} is not active."
                )
        
        return data
    
    def create(self, validated_data):
        participants = validated_data.pop('participants', [])
        chat = Chat.objects.create(**validated_data)
        
        # Add participants
        if participants:
            chat.participants.set(participants)
        
        # Set creator as admin for group chats
        request = self.context.get('request')
        if request and chat.chat_type == 'group':
            chat.admin = request.user
            chat.save()
        
        return chat
    
    def get_participants_info(self, obj):
        participants = obj.participants.all()
        return [{
            'id': user.id,
            'username': user.username,
            'profile_image': user.profile_image.url if user.profile_image else None,
            'is_online': user.is_online
        } for user in participants]
    
    def get_last_message(self, obj):
        last_msg = obj.messages.filter(is_deleted=False).last()
        if last_msg:
            return MessageSummarySerializer(last_msg).data
        return None
    
    def get_admin_info(self, obj):
        if obj.admin:
            return {
                'id': obj.admin.id,
                'username': obj.admin.username,
                'profile_image': obj.admin.profile_image.url if obj.admin.profile_image else None
            }
        return None

# In serializers.py - Add this new serializer
class ChatUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating chat info (limited fields)"""
    class Meta:
        model = Chat
        fields = ['name', 'description', 'image']
        read_only_fields = ['id', 'chat_type', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        if len(value) < 1:
            raise serializers.ValidationError("Chat name cannot be empty")
        if len(value) > 100:
            raise serializers.ValidationError("Chat name cannot exceed 100 characters")
        return value
    
    def validate_description(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Description cannot exceed 500 characters")
        return value
    
class MessageMediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField(read_only=True)
    formatted_size = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MessageMedia
        fields = [
            'id', 'file', 'file_name', 'file_size', 'formatted_size',
            'mime_type', 'duration', 'width', 'height', 'thumbnail',
            'url', 'thumbnail_url', 'uploaded_at'
        ]
        read_only_fields = [
            'file_name', 'file_size', 'mime_type', 'duration',
            'width', 'height', 'uploaded_at', 'formatted_size'
        ]
    
    def get_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.url if obj.file else None
    
    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        if request and obj.thumbnail:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url if obj.thumbnail else None
    
    def get_formatted_size(self, obj):
        return obj.formatted_size
    
    def validate_file(self, value):
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size cannot exceed {max_size / (1024 * 1024)}MB"
            )
        
        # Check file extension
        ext = os.path.splitext(value.name)[1].lower()
        valid_extensions = (
            MessageMedia.VALID_IMAGE_EXTENSIONS +
            MessageMedia.VALID_VIDEO_EXTENSIONS +
            MessageMedia.VALID_AUDIO_EXTENSIONS +
            MessageMedia.VALID_DOCUMENT_EXTENSIONS
        )
        if ext not in valid_extensions:
            raise serializers.ValidationError(
                f"Unsupported file type. Allowed: {', '.join(valid_extensions)}"
            )
        
        return value


class MessageStatusSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MessageStatus
        fields = [
            'id', 'message', 'user', 'user_info', 'status',
            'delivered_at', 'read_at', 'updated_at'
        ]
        read_only_fields = ['updated_at', 'delivered_at', 'read_at']
    
    def get_user_info(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username
        }
    
    def validate(self, data):
        message = data.get('message')
        user = data.get('user')
        
        if user not in message.chat.participants.all():
            raise serializers.ValidationError(
                "User must be a participant in the chat."
            )
        
        # Ensure status transitions are valid
        current_status = None
        if self.instance:
            current_status = self.instance.status
        
        new_status = data.get('status')
        valid_transitions = {
            'sent': ['delivered', 'failed'],
            'delivered': ['read', 'failed'],
            'read': [],
            'failed': ['sent']
        }
        
        if current_status and new_status not in valid_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"Cannot transition from {current_status} to {new_status}"
            )
        
        return data


class MessageReactionSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'message', 'user', 'user_info', 'emoji', 'reacted_at']
        read_only_fields = ['reacted_at']
    
    def get_user_info(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'profile_image': obj.user.profile_image.url if obj.user.profile_image else None
        }
    
    def validate(self, data):
        message = data.get('message')
        user = data.get('user')
        
        if user not in message.chat.participants.all():
            raise serializers.ValidationError(
                "User must be a participant in the chat."
            )
        
        return data
    
    def create(self, validated_data):
        # Use get_or_create to update existing reaction
        message = validated_data['message']
        user = validated_data['user']
        emoji = validated_data['emoji']
        
        reaction, created = MessageReaction.objects.update_or_create(
            message=message,
            user=user,
            defaults={'emoji': emoji}
        )
        
        return reaction


# ... (keep all other serializers the same) ...

class MessageSummarySerializer(serializers.ModelSerializer):
    """Serializer for message preview/summary"""
    sender_info = serializers.SerializerMethodField()
    reply_to_info = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()
    reactions_summary = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()  # Fixed this line
    
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
            'profile_image': obj.sender.profile_image.url if obj.sender.profile_image else None
        }
    
    def get_reply_to_info(self, obj):
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender': obj.reply_to.sender.username,
                'message_type': obj.reply_to.message_type,
                'summary': obj.reply_to.get_summary()
            }
        return None
    
    def get_media_count(self, obj):
        return obj.media.count()
    
    def get_reactions_summary(self, obj):
        return obj.reaction_summary
    
    def get_summary(self, obj):  
        return obj.get_summary()

class MessageSerializer(serializers.ModelSerializer):
    sender_info = serializers.SerializerMethodField(read_only=True)
    chat_info = serializers.SerializerMethodField(read_only=True)
    media = MessageMediaSerializer(many=True, read_only=True)
    statuses = MessageStatusSerializer(many=True, read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    reply_to_info = serializers.SerializerMethodField(read_only=True)
    location_data = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'client_message_id', 'chat', 'chat_info', 'sender', 'sender_info',
            'message_type', 'text', 'created_at', 'updated_at', 'is_edited',
            'is_forwarded', 'is_deleted', 'deleted_at', 'deleted_by',
            'reply_to', 'reply_to_info', 'latitude', 'longitude', 'location_name',
            'location_data', 'media', 'statuses', 'reactions'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'is_edited', 'is_forwarded',
            'is_deleted', 'deleted_at', 'deleted_by'
        ]
        extra_kwargs = {
            'client_message_id': {'required': False},
            'sender': {'write_only': True}
        }
    
    def get_sender_info(self, obj):
        return {
            'id': obj.sender.id,
            'username': obj.sender.username,
            'profile_image': obj.sender.profile_image.url if obj.sender.profile_image else None
        }
    
    def get_chat_info(self, obj):
        return {
            'id': obj.chat.id,
            'name': obj.chat.name,
            'chat_type': obj.chat.chat_type
        }
    
    def get_reply_to_info(self, obj):
        if obj.reply_to:
            return MessageSummarySerializer(obj.reply_to).data
        return None
    
    def get_location_data(self, obj):
        if obj.message_type == 'location' and obj.latitude and obj.longitude:
            return {
                'latitude': float(obj.latitude),
                'longitude': float(obj.longitude),
                'location_name': obj.location_name
            }
        return None
    
    def validate(self, data):
        chat = data.get('chat')
        sender = data.get('sender')
        message_type = data.get('message_type')
        text = data.get('text', '')
        
        # Check if sender is a chat participant
        if sender not in chat.participants.all():
            raise serializers.ValidationError(
                "Sender must be a participant in the chat."
            )
        
        # Validate message content based on type
        if message_type == 'text':
            if not text.strip():
                raise serializers.ValidationError("Text message cannot be empty.")
        elif message_type == 'location':
            if not data.get('latitude') or not data.get('longitude'):
                raise serializers.ValidationError(
                    "Location messages require latitude and longitude."
                )
        
        # Validate reply_to message
        reply_to = data.get('reply_to')
        if reply_to and reply_to.chat != chat:
            raise serializers.ValidationError(
                "Reply must be to a message in the same chat."
            )
        
        return data
    
    def create(self, validated_data):
        # Set sender from request if not provided
        request = self.context.get('request')
        if request and 'sender' not in validated_data:
            validated_data['sender'] = request.user
        
        message = Message.objects.create(**validated_data)
        
        # Create initial status for all participants except sender
        chat_participants = message.chat.participants.exclude(id=message.sender.id)
        for participant in chat_participants:
            MessageStatus.objects.create(
                message=message,
                user=participant,
                status='sent'
            )
        
        # Create status for sender as 'delivered'
        MessageStatus.objects.create(
            message=message,
            user=message.sender,
            status='delivered'
        )
        
        return message


class CallParticipantSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField(read_only=True)
    duration = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = CallParticipant
        fields = [
            'id', 'user', 'user_info', 'joined_at', 'left_at',
            'is_muted', 'is_video_enabled', 'role', 'duration'
        ]
        read_only_fields = ['joined_at', 'left_at', 'duration']
    
    def get_user_info(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'profile_image': obj.user.profile_image.url if obj.user.profile_image else None,
            'is_online': obj.user.is_online
        }
    
    def get_duration(self, obj):
        return obj.duration
    
    def validate(self, data):
        user = data.get('user')
        call = data.get('call')
        
        if user not in call.chat.participants.all():
            raise serializers.ValidationError(
                "User must be a participant in the chat."
            )
        
        return data


class CallQualitySerializer(serializers.ModelSerializer):
    is_good_quality = serializers.BooleanField(read_only=True)
    is_poor_quality = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CallQuality
        fields = [
            'id', 'call', 'participant', 'latency_ms', 'jitter_ms',
            'packet_loss', 'bitrate_kbps', 'quality_status',
            'is_good_quality', 'is_poor_quality', 'measured_at'
        ]
        read_only_fields = ['measured_at', 'quality_status', 'is_good_quality', 'is_poor_quality']
    
    def validate_latency_ms(self, value):
        if value < 0 or value > 10000:  # Max 10 seconds
            raise serializers.ValidationError("Latency must be between 0 and 10000 ms.")
        return value
    
    def validate_jitter_ms(self, value):
        if value < 0 or value > 1000:  # Max 1 second
            raise serializers.ValidationError("Jitter must be between 0 and 1000 ms.")
        return value
    
    def validate_packet_loss(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Packet loss must be between 0 and 100 percent.")
        return value
    
    def validate_bitrate_kbps(self, value):
        if value is not None and (value < 0 or value > 10000):  # Max 10 Mbps
            raise serializers.ValidationError("Bitrate must be between 0 and 10000 kbps.")
        return value


class CallSerializer(serializers.ModelSerializer):
    participants = CallParticipantSerializer(many=True, read_only=True)
    quality_logs = CallQualitySerializer(many=True, read_only=True)
    initiated_by_info = serializers.SerializerMethodField(read_only=True)
    chat_info = serializers.SerializerMethodField(read_only=True)
    duration = serializers.IntegerField(read_only=True)
    participant_count = serializers.IntegerField(read_only=True)
    active_participant_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Call
        fields = [
            'id', 'chat', 'chat_info', 'call_type', 'status',
            'started_at', 'ended_at', 'call_duration', 'duration',
            'initiated_by', 'initiated_by_info', 'is_group_call',
            'participants', 'participant_count', 'active_participant_count',
            'quality_logs'
        ]
        read_only_fields = [
            'started_at', 'ended_at', 'call_duration', 'status',
            'duration', 'participant_count', 'active_participant_count'
        ]
    
    def get_initiated_by_info(self, obj):
        if obj.initiated_by:
            return {
                'id': obj.initiated_by.id,
                'username': obj.initiated_by.username,
                'profile_image': obj.initiated_by.profile_image.url if obj.initiated_by.profile_image else None
            }
        return None
    
    def get_chat_info(self, obj):
        return {
            'id': obj.chat.id,
            'name': obj.chat.name,
            'chat_type': obj.chat.chat_type
        }
    
    def validate(self, data):
        chat = data.get('chat')
        
        if chat.chat_type == 'private' and chat.participants.count() != 2:
            raise serializers.ValidationError(
                "Private chat must have exactly 2 participants for a call."
            )
        
        # Check if there's already an ongoing call in this chat
        if Call.objects.filter(chat=chat, status='ongoing').exists():
            raise serializers.ValidationError(
                "There is already an ongoing call in this chat."
            )
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        
        # Set initiated_by from request
        if request and 'initiated_by' not in validated_data:
            validated_data['initiated_by'] = request.user
        
        call = Call.objects.create(**validated_data)
        
        # Add initiator as first participant
        CallParticipant.objects.create(
            call=call,
            user=validated_data['initiated_by'],
            role='caller'
        )
        
        return call


class CallUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating call status"""
    class Meta:
        model = Call
        fields = ['status']
    
    def validate_status(self, value):
        valid_transitions = {
            'initiated': ['ongoing', 'missed', 'rejected'],
            'ongoing': ['completed'],
            'completed': [],
            'missed': [],
            'rejected': []
        }
        
        current_status = self.instance.status if self.instance else None
        if current_status and value not in valid_transitions.get(current_status, []):
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
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist.")
        
        return user