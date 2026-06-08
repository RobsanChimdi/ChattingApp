from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
import os
import uuid
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q, Avg
from django.db.models.functions import Trunc
from django.utils.crypto import get_random_string


class User(AbstractUser):
    profile_image = models.ImageField(upload_to="profiles/", blank=True, null=True)
    bio = models.TextField(blank=True, null=True, max_length=500)
    last_seen = models.DateTimeField(blank=True, null=True)
    is_online = models.BooleanField(default=False)
    
    # Additional useful fields for messaging apps
    phone_number = models.CharField(max_length=20, blank=True, null=True, unique=True)
    status = models.CharField(max_length=100, blank=True, null=True, default="Hey there! I'm using ChatApp")
    privacy_last_seen = models.CharField(
        max_length=20,
        choices=[("everyone", "Everyone"), ("contacts", "Contacts Only"), ("nobody", "Nobody")],
        default="everyone"
    )
    verification_code = models.CharField(max_length=6, blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    # Password reset
    reset_token = models.UUIDField(blank=True, null=True)
    reset_token_expiry = models.DateTimeField(blank=True, null=True)

    # WebSocket token
    websocket_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    websocket_token_expiry = models.DateTimeField(blank=True, null=True)

    def get_display_name(self):
        """Get display name for user"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        return self.username

    def generate_verification_code(self):
        self.verification_code = get_random_string(6, allowed_chars='0123456789')
        self.save(update_fields=['verification_code'])
    
    def generate_reset_token(self, hours_valid=1):
        self.reset_token = uuid.uuid4()
        self.reset_token_expiry = timezone.now() + timedelta(hours=hours_valid)
        self.save(update_fields=['reset_token', 'reset_token_expiry'])
    
    def generate_websocket_token(self, hours_valid=24):
        """Generate token for WebSocket authentication"""
        self.websocket_token = uuid.uuid4()
        self.websocket_token_expiry = timezone.now() + timedelta(hours=hours_valid)
        self.save(update_fields=['websocket_token', 'websocket_token_expiry'])
        return {
            'token': str(self.websocket_token),
            'user_id': self.id
        }
    
    def verify_websocket_token(self, token):
        """Verify WebSocket token"""
        if not token or str(self.websocket_token) != token:
            return False
        if self.websocket_token_expiry and self.websocket_token_expiry < timezone.now():
            return False
        return True
    
    class Meta:
        ordering = ['username']
        indexes = [
            models.Index(fields=['last_seen']),
            models.Index(fields=['is_online']),
            models.Index(fields=['websocket_token']),
        ]
    
    def __str__(self):
        return self.username
    
    def update_last_seen(self):
        """Update last_seen and online status"""
        self.last_seen = timezone.now()
        self.is_online = True
        self.save(update_fields=['last_seen', 'is_online'])
    
    def set_offline(self):
        """Mark user as offline"""
        self.is_online = False
        self.last_seen = timezone.now()
        self.save(update_fields=['is_online', 'last_seen'])


class Chat(models.Model):
    CHAT_TYPES = (
        ("private", "Private"),
        ("group", "Group"),
    )
    
    chat_type = models.CharField(max_length=20, choices=CHAT_TYPES)
    name = models.CharField(max_length=255, blank=True, null=True)
    participants = models.ManyToManyField(User, related_name="chats")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_chats")
    is_active = models.BooleanField(default=True)
    
    # For group chats
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to="group_images/", blank=True, null=True)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['chat_type', 'updated_at']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        if self.chat_type == "group":
            return self.name or f"Group Chat {self.id}"
        participants = self.participants.all()[:2]
        if len(participants) == 2:
            return f"{participants[0].username} & {participants[1].username}"
        return f"Chat {self.id}"
    
    def clean(self):
        """Validate chat constraints"""
        if self.chat_type == "private":
            if self.pk and self.participants.count() != 2:
                raise ValidationError("Private chats must have exactly 2 participants")
            if self.name:
                raise ValidationError("Private chats should not have a name")
        elif self.chat_type == "group":
            if not self.name:
                raise ValidationError("Group chats must have a name")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def add_participant(self, user):
        """Add a participant to chat"""
        if self.chat_type == "private" and self.participants.count() >= 2:
            raise ValidationError("Private chats cannot have more than 2 participants")
        self.participants.add(user)
    
    def remove_participant(self, user):
        """Remove a participant from chat"""
        if self.chat_type == "private":
            raise ValidationError("Cannot remove participants from private chats")
        self.participants.remove(user)
    
    def last_message(self):
        """Get the last message in chat"""
        return self.messages.filter(is_deleted=False).first()
    
    def unread_count(self, user):
        """Get unread message count for a specific user"""
        # Count messages where user hasn't marked as read
        return self.messages.filter(
            ~Q(sender=user),
            is_deleted=False
        ).exclude(
            statuses__user=user,
            statuses__status='read'
        ).distinct().count()


class Message(models.Model):
    MESSAGE_TYPES = (
        ("text", "Text"),
        ("image", "Image"),
        ("video", "Video"),
        ("audio", "Audio"),
        ("file", "File"),
        ("location", "Location"),
    )
    
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES)
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_forwarded = models.BooleanField(default=False)
    reply_to = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies"
    )
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="deleted_messages"
    )
    
    # For location messages
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_name = models.CharField(max_length=255, blank=True, null=True)
    
    # For message metadata
    client_message_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        indexes = [
            models.Index(fields=['chat', '-created_at']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['client_message_id']),
        ]
    
    def __str__(self):
        return f"Message {self.id} from {self.sender}"
    
    def clean(self):
        """Validate message constraints"""
        if self.reply_to and self.reply_to.chat != self.chat:
            raise ValidationError("Reply must be to a message in the same chat")
        
        if self.message_type == "location":
            if not (self.latitude and self.longitude):
                raise ValidationError("Location messages require latitude and longitude")
        
        if self.message_type == "text" and not self.text.strip():
            raise ValidationError("Text message cannot be empty")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        if self.is_deleted and not self.deleted_at:
            self.deleted_at = timezone.now()
        
        if not self.pk:  # New message
            super().save(*args, **kwargs)
            self.chat.updated_at = self.created_at
            self.chat.save(update_fields=['updated_at'])
        else:
            super().save(*args, **kwargs)
    
    def edit_message(self, new_text, editor):
        """Edit message text"""
        if self.is_deleted:
            raise ValueError("Cannot edit a deleted message")
        
        self.text = new_text
        self.is_edited = True
        self.updated_at = timezone.now()
        self.save(update_fields=['text', 'is_edited', 'updated_at'])
    
    def soft_delete(self, deleted_by):
        """Soft delete message"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = deleted_by
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
    
    def hard_delete(self):
        """Permanently delete message"""
        for media in self.media.all():
            if media.file and os.path.isfile(media.file.path):
                os.remove(media.file.path)
        super().delete()
    
    def get_summary(self):
        """Get message summary for preview"""
        if self.is_deleted:
            return "This message was deleted"
        
        if self.message_type == "text":
            return self.text[:50] + ("..." if len(self.text) > 50 else "")
        elif self.message_type == "location":
            return f"📍 Location: {self.location_name or 'Shared location'}"
        elif self.message_type in ["image", "video", "audio"]:
            return f"{self.message_type.capitalize()}: {self.text or 'Media'}"
        else:
            return f"{self.message_type.capitalize()} Message"
    
    def mark_as_forwarded(self):
        """Mark message as forwarded"""
        self.is_forwarded = True
        self.save(update_fields=['is_forwarded'])
    
    def create_reaction(self, user, emoji):
        """Create or update reaction for this message"""
        reaction, created = MessageReaction.objects.get_or_create(
            message=self,
            user=user,
            defaults={'emoji': emoji}
        )
        if not created and reaction.emoji != emoji:
            reaction.emoji = emoji
            reaction.save(update_fields=['emoji'])
        return reaction
    
    @property
    def reaction_summary(self):
        """Get summary of reactions"""
        reactions = self.reactions.values('emoji').annotate(count=Count('emoji')).order_by('-count')
        return list(reactions)
    
    @property
    def status_summary(self):
        """Get delivery/read status summary"""
        statuses = self.statuses.all()
        return {
            'sent': statuses.filter(status='sent').count(),
            'delivered': statuses.filter(status='delivered').count(),
            'read': statuses.filter(status='read').count(),
            'failed': statuses.filter(status='failed').count(),
        }


class MessageMedia(models.Model):
    VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    VALID_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv']
    VALID_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac']
    VALID_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.pptx']
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="media")
    file = models.FileField(upload_to="message_media/%Y/%m/%d/")
    thumbnail = models.ImageField(upload_to="message_media/thumbnails/%Y/%m/%d/", blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.BigIntegerField(blank=True, null=True)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    duration = models.FloatField(blank=True, null=True)
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['uploaded_at']
        unique_together = ("message", "file")
        verbose_name = "Message Media"
        verbose_name_plural = "Message Media"
    
    def __str__(self):
        return f"Media for Message {self.message.id}"
    
    def clean(self):
        """Validate media file"""
        if self.file:
            file_extension = os.path.splitext(self.file.name)[1].lower()
            
            if self.message.message_type == "image" and file_extension not in self.VALID_IMAGE_EXTENSIONS:
                raise ValidationError(f"Invalid image format. Allowed: {', '.join(self.VALID_IMAGE_EXTENSIONS)}")
            
            elif self.message.message_type == "video" and file_extension not in self.VALID_VIDEO_EXTENSIONS:
                raise ValidationError(f"Invalid video format. Allowed: {', '.join(self.VALID_VIDEO_EXTENSIONS)}")
            
            elif self.message.message_type == "audio" and file_extension not in self.VALID_AUDIO_EXTENSIONS:
                raise ValidationError(f"Invalid audio format. Allowed: {', '.join(self.VALID_AUDIO_EXTENSIONS)}")
    
    def save(self, *args, **kwargs):
        """Populate file metadata before saving"""
        self.full_clean()
        
        if not self.file_name and self.file:
            self.file_name = os.path.basename(self.file.name)
        
        if not self.file_size and self.file:
            try:
                self.file_size = self.file.size
            except (OSError, FileNotFoundError):
                pass
        
        super().save(*args, **kwargs)
    
    @property
    def filename(self):
        return self.file_name or os.path.basename(self.file.name)
    
    @property
    def extension(self):
        return os.path.splitext(self.file.name)[1].lower()
    
    @property
    def url(self):
        return self.file.url if self.file else None
    
    @property
    def download_url(self):
        return self.file.url if self.file else None
    
    @property
    def formatted_size(self):
        """Return human-readable file size"""
        if not self.file_size:
            return "Unknown"
        
        size = float(self.file_size)
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    def delete(self, *args, **kwargs):
        """Delete file from storage when model is deleted"""
        if self.file and os.path.isfile(self.file.path):
            os.remove(self.file.path)
        if self.thumbnail and os.path.isfile(self.thumbnail.path):
            os.remove(self.thumbnail.path)
        super().delete(*args, **kwargs)


class MessageStatus(models.Model):
    STATUS_TYPES = (
        ("sent", "Sent"),
        ("delivered", "Delivered"),
        ("read", "Read"),
        ("failed", "Failed"),
    )
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="statuses")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_TYPES)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ("message", "user")
        indexes = [
            models.Index(fields=['user', 'status', 'updated_at']),
        ]
    
    def __str__(self):
        return f"Status of Message {self.message.id} for {self.user.username}"
    
    def save(self, *args, **kwargs):
        """Update timestamps based on status"""
        if self.status == "delivered" and not self.delivered_at:
            self.delivered_at = timezone.now()
        elif self.status == "read" and not self.read_at:
            self.read_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    def mark_as_read(self):
        self.status = "read"
        self.save()
    
    def mark_as_delivered(self):
        self.status = "delivered"
        self.save()
    
    def mark_as_sent(self):
        self.status = "sent"
        self.save()
    
    def mark_as_failed(self):
        self.status = "failed"
        self.save()


class MessageReaction(models.Model):
    EMOJI_CHOICES = [
        ("👍", "Thumbs Up"),
        ("❤️", "Heart"),
        ("😂", "Laughing"),
        ("😮", "Surprised"),
        ("😢", "Crying"),
        ("😡", "Angry"),
    ]
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10, choices=EMOJI_CHOICES)
    reacted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ("message", "user")
        indexes = [
            models.Index(fields=['message', 'emoji']),
        ]
    
    def __str__(self):
        return f"{self.emoji} by {self.user.username} on Message {self.message.id}"


class Call(models.Model):
    CALL_TYPES = (
        ("audio", "Audio"),
        ("video", "Video"),
    )
    
    CALL_STATUS = (
        ("initiated", "Initiated"),
        ("ongoing", "Ongoing"),
        ("completed", "Completed"),
        ("missed", "Missed"),
        ("rejected", "Rejected"),
    )
    
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="calls")
    call_type = models.CharField(max_length=10, choices=CALL_TYPES)
    status = models.CharField(max_length=15, choices=CALL_STATUS, default="initiated")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="initiated_calls")
    call_duration = models.IntegerField(blank=True, null=True)
    is_group_call = models.BooleanField(default=False)
    
    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=['chat', '-started_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.call_type} call in chat {self.chat.id}"
    
    def end_call(self, status="completed"):
        """End the call"""
        self.ended_at = timezone.now()
        self.status = status
        
        if self.started_at and self.ended_at:
            self.call_duration = int((self.ended_at - self.started_at).total_seconds())
        
        self.save(update_fields=['ended_at', 'status', 'call_duration'])
    
    @property
    def duration(self):
        """Get call duration in seconds"""
        if self.call_duration:
            return self.call_duration
        if self.ended_at:
            return int((self.ended_at - self.started_at).total_seconds())
        if self.started_at:
            return int((timezone.now() - self.started_at).total_seconds())
        return 0
    
    @property
    def is_ongoing(self):
        return self.status == "ongoing"
    
    @property
    def participant_count(self):
        return self.participants.count()
    
    @property
    def active_participant_count(self):
        return self.participants.filter(left_at__isnull=True).count()
    
    def get_participants(self):
        return self.participants.select_related('user')
    
    def get_active_participants(self):
        return self.participants.filter(left_at__isnull=True).select_related('user')


class CallParticipant(models.Model):
    ROLES = (
        ("initiator", "Initiator"),
        ("caller", "Caller"),
        ("callee", "Callee"),
        ("participant", "Participant"),
    )
    
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(blank=True, null=True)
    is_muted = models.BooleanField(default=False)
    is_video_enabled = models.BooleanField(default=True)
    is_speaking = models.BooleanField(default=False)
    role = models.CharField(
        max_length=20,
        choices=ROLES,
        default="participant"
    )
    has_video = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ("call", "user")
        ordering = ['joined_at']
        indexes = [
            models.Index(fields=['call', 'is_speaking']),
        ]
    
    def __str__(self):
        return f"{self.user.username} in Call {self.call.id}"
    
    @property
    def duration(self):
        if self.left_at:
            return int((self.left_at - self.joined_at).total_seconds())
        if self.joined_at:
            return int((timezone.now() - self.joined_at).total_seconds())
        return 0
    
    def leave_call(self):
        self.left_at = timezone.now()
        self.save(update_fields=['left_at'])
    
    def toggle_mute(self):
        self.is_muted = not self.is_muted
        self.save(update_fields=['is_muted'])
    
    def toggle_video(self):
        self.is_video_enabled = not self.is_video_enabled
        self.has_video = self.is_video_enabled
        self.save(update_fields=['is_video_enabled', 'has_video'])
    
    def set_speaking(self, is_speaking):
        """Update speaking status"""
        self.is_speaking = is_speaking
        self.save(update_fields=['is_speaking'])


class CallQuality(models.Model):
    QUALITY_STATUS = (
        ("excellent", "Excellent"),
        ("good", "Good"),
        ("fair", "Fair"),
        ("poor", "Poor"),
        ("bad", "Bad"),
    )
    
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name="quality_logs")
    participant = models.ForeignKey(CallParticipant, on_delete=models.CASCADE, null=True, blank=True)
    latency_ms = models.IntegerField()
    jitter_ms = models.IntegerField()
    packet_loss = models.FloatField()
    bitrate_kbps = models.IntegerField(null=True, blank=True)
    audio_bitrate = models.IntegerField(null=True, blank=True)
    video_bitrate = models.IntegerField(null=True, blank=True)
    audio_level = models.FloatField(null=True, blank=True)
    quality_status = models.CharField(max_length=20, choices=QUALITY_STATUS, blank=True, null=True)
    measured_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["-measured_at"]
        indexes = [
            models.Index(fields=['call', '-measured_at']),
            models.Index(fields=['quality_status']),
        ]
    
    def __str__(self):
        return f"Quality log for Call {self.call.id} at {self.measured_at}"
    
    def save(self, *args, **kwargs):
        """Calculate quality status before saving"""
        self.quality_status = self._calculate_quality_status()
        super().save(*args, **kwargs)
    
    def _calculate_quality_status(self):
        """Calculate quality status based on metrics"""
        if self.latency_ms < 100 and self.jitter_ms < 20 and self.packet_loss < 0.5:
            return "excellent"
        elif self.latency_ms < 150 and self.jitter_ms < 30 and self.packet_loss < 1.0:
            return "good"
        elif self.latency_ms < 200 and self.jitter_ms < 50 and self.packet_loss < 2.0:
            return "fair"
        elif self.latency_ms < 300 and self.jitter_ms < 100 and self.packet_loss < 5.0:
            return "poor"
        else:
            return "bad"
    
    @property
    def is_good_quality(self):
        return self.quality_status in ["excellent", "good"]
    
    @property
    def is_poor_quality(self):
        return self.quality_status in ["poor", "bad"]
    
    @classmethod
    def average_quality(cls, call_id):
        """Calculate average quality metrics for a call"""
        logs = cls.objects.filter(call_id=call_id)
        if not logs.exists():
            return None
        
        avg = logs.aggregate(
            avg_latency=Avg('latency_ms'),
            avg_jitter=Avg('jitter_ms'),
            avg_packet_loss=Avg('packet_loss'),
            avg_bitrate=Avg('bitrate_kbps'),
            avg_audio_bitrate=Avg('audio_bitrate'),
            avg_video_bitrate=Avg('video_bitrate'),
            avg_audio_level=Avg('audio_level')
        )
        
        return {
            "average_latency_ms": round(avg['avg_latency'], 2) if avg['avg_latency'] else None,
            "average_jitter_ms": round(avg['avg_jitter'], 2) if avg['avg_jitter'] else None,
            "average_packet_loss": round(avg['avg_packet_loss'], 2) if avg['avg_packet_loss'] else None,
            "average_bitrate_kbps": round(avg['avg_bitrate'], 2) if avg['avg_bitrate'] else None,
            "average_audio_bitrate": round(avg['avg_audio_bitrate'], 2) if avg['avg_audio_bitrate'] else None,
            "average_video_bitrate": round(avg['avg_video_bitrate'], 2) if avg['avg_video_bitrate'] else None,
            "average_audio_level": round(avg['avg_audio_level'], 2) if avg['avg_audio_level'] else None,
            "total_logs": logs.count()
        }
    
    @classmethod
    def quality_report(cls, call_id):
        """Generate comprehensive quality report"""
        logs = cls.objects.filter(call_id=call_id)
        if not logs.exists():
            return None
        
        status_counts = logs.values('quality_status').annotate(count=Count('id'))
        
        trends = logs.order_by('measured_at').values(
            'measured_at', 'latency_ms', 'jitter_ms', 'packet_loss', 
            'audio_bitrate', 'video_bitrate', 'audio_level', 'quality_status'
        )[:50]
        
        avg_metrics = cls.average_quality(call_id)
        
        return {
            "summary": avg_metrics,
            "status_distribution": list(status_counts),
            "trends": list(trends),
            "best_log": logs.order_by('latency_ms', 'jitter_ms', 'packet_loss').first(),
            "worst_log": logs.order_by('-latency_ms', '-jitter_ms', '-packet_loss').first()
        }