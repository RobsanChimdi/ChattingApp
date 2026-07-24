# urls.py
from django.urls import path
from . import views

urlpatterns = [
    # =====================
    # 🔐 AUTHENTICATION
    # =====================
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/websocket-token/', views.WebSocketTokenView.as_view(), name='websocket-token'),
    path('auth/verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),
    path('auth/resend-verification/', views.ResendVerificationCodeView.as_view(), name='resend-verification'),
    path('auth/password-reset-request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset-confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # =====================
    # 👤 USERS
    # =====================
    path('users/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('users/me/update/', views.UpdateProfileView.as_view(), name='update-profile'),
    path('users/search/', views.UserSearchView.as_view(), name='user-search'),
    path('users/<int:user_id>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/online-status/', views.UserOnlineStatusView.as_view(), name='online-status'),
    path('users/me/update-last-seen/', views.UpdateLastSeenView.as_view(), name='update-last-seen'),
    path('users/me/set-offline/', views.SetOfflineView.as_view(), name='set-offline'),

    # =====================
    # 💬 CHATS
    # =====================
    path('chats/', views.ChatListCreateView.as_view(), name='chat-list-create'),
    path('chats/<int:pk>/', views.ChatDetailView.as_view(), name='chat-detail'),
    path('chats/private/create/', views.CreatePrivateChatView.as_view(), name='create-private-chat'),
    path('chats/<int:chat_id>/add-participant/', views.AddParticipantView.as_view(), name='add-participant'),
    path('chats/<int:chat_id>/remove-participant/', views.RemoveParticipantView.as_view(), name='remove-participant'),
    path('chats/<int:chat_id>/leave/', views.LeaveChatView.as_view(), name='leave-chat'),
    path('chats/<int:chat_id>/update/', views.UpdateChatInfoView.as_view(), name='update-chat-info'),
    path('chats/<int:chat_id>/messages/', views.ChatMessagesView.as_view(), name='chat-messages'),
    path('chats/unread-counts/', views.UnreadMessageCountView.as_view(), name='unread-counts'),

    # =====================
    # ✉️ MESSAGES
    # =====================
    path('messages/create/', views.MessageCreateView.as_view(), name='create-message'),
    path('messages/search/', views.MessageSearchView.as_view(), name='message-search'),
    path('messages/mark-all-read/', views.MarkAllAsReadView.as_view(), name='mark-all-read'),
    path('messages/<int:pk>/', views.MessageDetailView.as_view(), name='message-detail'),
    path('messages/<int:message_id>/mark-read/', views.MarkMessageAsReadView.as_view(), name='mark-message-read'),
    path('messages/<int:message_id>/forward/', views.ForwardMessageView.as_view(), name='forward-message'),
    path('messages/<int:message_id>/reactions/', views.MessageReactionView.as_view(), name='message-reactions'),
    path('messages/<int:message_id>/reactions/<str:emoji>/', views.RemoveMessageReactionView.as_view(), name='remove-reaction'),

    # =====================
    # 🖼 MEDIA
    # =====================
    path('media/upload/', views.MediaUploadView.as_view(), name='media-upload'),
    path('media/<int:media_id>/info/', views.MediaInfoView.as_view(), name='media-info'),
    path('media/<int:media_id>/download/', views.MediaDownloadView.as_view(), name='media-download'),
    path('media/chat/<int:chat_id>/', views.ChatMediaView.as_view(), name='chat-media'),

    # =====================
    # 📞 CALLS
    # =====================
    path('calls/', views.CallListCreateView.as_view(), name='call-list'),
    path('calls/active/', views.ActiveCallsView.as_view(), name='active-calls'),
    path('calls/<int:pk>/', views.CallDetailView.as_view(), name='call-detail'),
    path('calls/<int:call_id>/join/', views.JoinCallView.as_view(), name='join-call'),
    path('calls/<int:call_id>/leave/', views.LeaveCallView.as_view(), name='leave-call'),
    path('calls/<int:call_id>/end/', views.EndCallView.as_view(), name='end-call'),
    path('calls/<int:call_id>/toggle-mute/', views.ToggleMuteView.as_view(), name='toggle-mute'),
    path('calls/<int:call_id>/toggle-video/', views.ToggleVideoView.as_view(), name='toggle-video'),
    path('calls/<int:call_id>/participants/', views.CallParticipantsView.as_view(), name='call-participants'),
    path('calls/<int:call_id>/quality/log/', views.LogCallQualityView.as_view(), name='log-quality'),
    path('calls/<int:call_id>/quality/logs/', views.CallQualityLogsView.as_view(), name='quality-logs'),
    path('calls/<int:call_id>/quality/report/', views.CallQualityReportView.as_view(), name='quality-report'),

    # =====================
    # 📊 STATISTICS & SYSTEM
    # =====================
    path('statistics/', views.UserStatisticsView.as_view(), name='statistics'),
    path('health/', views.HealthCheckView.as_view(), name='health'),
]