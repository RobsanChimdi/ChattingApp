# urls.py (separate file)
from django.urls import path
from . import views

urlpatterns = [
    # =====================
    # 🔐 AUTHENTICATION
    # =====================
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/websocket/', views.WebSocketTokenView.as_view(), name='websocket-token'),

    # =====================
    # 👤 USERS
    # =====================
    path('users/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('users/me/update/', views.UpdateProfileView.as_view(), name='update-profile'),
    path('users/search/', views.UserSearchView.as_view(), name='user-search'),
    path('users/<int:user_id>/online_status/', views.UserOnlineStatusView.as_view(), name='online-status'),
    path('users/me/update_last_seen/', views.UpdateLastSeenView.as_view(), name='update-last-seen'),
    path('users/me/set_offline/', views.SetOfflineView.as_view(), name='set-offline'),

    # =====================
    # 💬 CHATS
    # =====================
    path('chats/', views.ChatListCreateView.as_view(), name='chat-list-create'),
    path('chats/private/create/', views.CreatePrivateChatView.as_view(), name='create-private-chat'),
    path('chats/<int:chat_id>/add_participant/', views.AddParticipantView.as_view(), name='add-participant'),
    path('chats/<int:chat_id>/remove_participant/', views.RemoveParticipantView.as_view(), name='remove-participant'),
    path('chats/<int:chat_id>/leave/', views.LeaveChatView.as_view(), name='leave-chat'),
    path('chats/<int:chat_id>/update/', views.UpdateChatInfoView.as_view(), name='update-chat-info'),
    path('chats/<int:chat_id>/messages/', views.ChatMessagesView.as_view(), name='chat-messages'),
    path('chats/unread_counts/', views.UnreadMessageCountView.as_view(), name='unread-counts'),

    # =====================
    # ✉️ MESSAGES
    # =====================
    path('messages/', views.MessageCreateView.as_view(), name='send-message'),
    path('messages/<int:message_id>/edit/', views.EditMessageView.as_view(), name='edit-message'),
    path('messages/<int:message_id>/soft_delete/', views.SoftDeleteMessageView.as_view(), name='soft-delete-message'),
    path('messages/<int:message_id>/react/', views.ReactToMessageView.as_view(), name='react-message'),
    path('messages/<int:message_id>/remove_reaction/', views.RemoveReactionView.as_view(), name='remove-reaction'),
    path('messages/<int:message_id>/forward/', views.ForwardMessageView.as_view(), name='forward-message'),
    path('messages/<int:message_id>/mark_read/', views.MarkMessageReadView.as_view(), name='mark-read'),
    path('messages/mark_all_read/', views.MarkAllReadView.as_view(), name='mark-all-read'),
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
    path('calls/<int:call_id>/toggle_mute/', views.ToggleMuteView.as_view(), name='toggle-mute'),
    path('calls/<int:call_id>/toggle_video/', views.ToggleVideoView.as_view(), name='toggle-video'),
    path('calls/<int:call_id>/participants/', views.CallParticipantsView.as_view(), name='call-participants'),
    path('calls/active/', views.ActiveCallsView.as_view(), name='active-calls'),
    path('calls/<int:call_id>/log_quality/', views.LogCallQualityView.as_view(), name='log-call-quality'),
    path('calls/<int:call_id>/quality_report/', views.CallQualityReportView.as_view(), name='call-quality-report'),
    path('calls/<int:call_id>/quality_logs/', views.CallQualityLogsView.as_view(), name='call-quality-logs'),

    # =====================
    # 📊 SYSTEM
    # =====================
    path('statistics/', views.UserStatisticsView.as_view(), name='statistics'),
    path('health/', views.HealthCheckView.as_view(), name='health'),
]