# urls.py (FIXED VERSION)
from django.urls import path
from . import views

urlpatterns = [
    # =====================
    # 🔐 AUTHENTICATION
    # =====================
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/websocket-token/', views.WebSocketTokenView.as_view(), name='websocket-token'),  # Renamed for consistency
    path('auth/verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),  # MISSING - Add this
    path('auth/password-reset-request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),  # MISSING
    path('auth/password-reset-confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),  # MISSING

    # =====================
    # 👤 USERS
    # =====================
    path('users/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('users/me/update/', views.UpdateProfileView.as_view(), name='update-profile'),
    path('users/search/', views.UserSearchView.as_view(), name='user-search'),
    path('users/<int:user_id>/online-status/', views.UserOnlineStatusView.as_view(), name='online-status'),  # Renamed for consistency
    path('users/me/update-last-seen/', views.UpdateLastSeenView.as_view(), name='update-last-seen'),  # Renamed for consistency
    path('users/me/set-offline/', views.SetOfflineView.as_view(), name='set-offline'),  # Renamed for consistency

    # =====================
    # 💬 CHATS
    # =====================
    path('chats/', views.ChatListCreateView.as_view(), name='chat-list-create'),
    path('chats/private/create/', views.CreatePrivateChatView.as_view(), name='create-private-chat'),
    path('chats/<int:chat_id>/add-participant/', views.AddParticipantView.as_view(), name='add-participant'),  # Renamed for consistency
    path('chats/<int:chat_id>/remove-participant/', views.RemoveParticipantView.as_view(), name='remove-participant'),  # Renamed for consistency
    path('chats/<int:chat_id>/leave/', views.LeaveChatView.as_view(), name='leave-chat'),
    path('chats/<int:chat_id>/update/', views.UpdateChatInfoView.as_view(), name='update-chat-info'),
    path('chats/<int:chat_id>/messages/', views.ChatMessagesView.as_view(), name='chat-messages'),
    path('chats/unread-counts/', views.UnreadMessageCountView.as_view(), name='unread-counts'),  # Renamed for consistency

    # =====================
    # ✉️ MESSAGES
    # =====================
    path('messages/', views.MessageCreateView.as_view(), name='send-message'),
    path('messages/<int:message_id>/edit/', views.EditMessageView.as_view(), name='edit-message'),
    path('messages/<int:message_id>/soft-delete/', views.SoftDeleteMessageView.as_view(), name='soft-delete-message'),  # Renamed for consistency
    path('messages/<int:message_id>/react/', views.ReactToMessageView.as_view(), name='react-message'),
    path('messages/<int:message_id>/remove-reaction/', views.RemoveReactionView.as_view(), name='remove-reaction'),  # Renamed for consistency
    path('messages/<int:message_id>/forward/', views.ForwardMessageView.as_view(), name='forward-message'),
    path('messages/<int:message_id>/mark-read/', views.MarkMessageReadView.as_view(), name='mark-read'),  # Renamed for consistency
    path('messages/mark-all-read/', views.MarkAllReadView.as_view(), name='mark-all-read'),  # Renamed for consistency
    path('messages/search/', views.SearchMessageView.as_view(), name='search-messages'),

    # =====================
    # 🖼 MEDIA
    # =====================
    path('media/upload/', views.MediaUploadView.as_view(), name='media-upload'),
    path('media/<int:media_id>/download/', views.MediaDownloadView.as_view(), name='media-download'),
    path('media/<int:media_id>/info/', views.MediaInfoView.as_view(), name='media-info'),
    path('media/chat/<int:chat_id>/', views.ChatMediaView.as_view(), name='chat-media'),

    # =====================
    # 📞 CALLS
    # =====================
    path('calls/', views.CallCreateView.as_view(), name='start-call'),
    path('calls/<int:call_id>/', views.CallDetailView.as_view(), name='call-detail'),
    path('calls/<int:call_id>/update/', views.UpdateCallView.as_view(), name='update-call'),
    path('calls/<int:call_id>/join/', views.JoinCallView.as_view(), name='join-call'),
    path('calls/<int:call_id>/leave/', views.LeaveCallView.as_view(), name='leave-call'),
    path('calls/<int:call_id>/end/', views.EndCallView.as_view(), name='end-call'),
    path('calls/<int:call_id>/toggle-mute/', views.ToggleMuteView.as_view(), name='toggle-mute'),  # Renamed for consistency
    path('calls/<int:call_id>/toggle-video/', views.ToggleVideoView.as_view(), name='toggle-video'),  # Renamed for consistency
    path('calls/<int:call_id>/participants/', views.CallParticipantsView.as_view(), name='call-participants'),
    path('calls/active/', views.ActiveCallsView.as_view(), name='active-calls'),
    path('calls/<int:call_id>/log-quality/', views.LogCallQualityView.as_view(), name='log-call-quality'),  # Renamed for consistency
    path('calls/<int:call_id>/quality-report/', views.CallQualityReportView.as_view(), name='call-quality-report'),  # Renamed for consistency
    path('calls/<int:call_id>/quality-logs/', views.CallQualityLogsView.as_view(), name='call-quality-logs'),  # Renamed for consistency

    # =====================
    # 📊 STATISTICS & SYSTEM
    # =====================
    path('statistics/', views.UserStatisticsView.as_view(), name='statistics'),
    path('health/', views.HealthCheckView.as_view(), name='health'),
]