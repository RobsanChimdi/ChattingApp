// api.types.ts
export const API_ENDPOINTS = {
  // Auth
  REGISTER: '/auth/register/',
  LOGIN: '/auth/login/',
  LOGOUT: '/auth/logout/',
  WEBSOCKET_TOKEN: '/auth/websocket-token/',
  VERIFY_EMAIL: '/auth/verify-email/',
  RESEND_VERIFICATION: '/auth/resend-verification/',
  PASSWORD_RESET_REQUEST: '/auth/password-reset-request/',
  PASSWORD_RESET_CONFIRM: '/auth/password-reset-confirm/',
  
  // Users
  CURRENT_USER: '/users/me/',
  UPDATE_PROFILE: '/users/me/update/',
  USER_SEARCH: '/users/search/',
  USER_DETAIL: '/users/{id}/',
  USER_ONLINE_STATUS: '/users/{id}/online-status/',
  UPDATE_LAST_SEEN: '/users/me/update-last-seen/',
  SET_OFFLINE: '/users/me/set-offline/',
  
  // Chats
  CHATS: '/chats/',
  CHAT_DETAIL: '/chats/{id}/',
  CREATE_PRIVATE_CHAT: '/chats/private/create/',
  ADD_PARTICIPANT: '/chats/{id}/add-participant/',
  REMOVE_PARTICIPANT: '/chats/{id}/remove-participant/',
  LEAVE_CHAT: '/chats/{id}/leave/',
  UPDATE_CHAT_INFO: '/chats/{id}/update/',
  CHAT_MESSAGES: '/chats/{id}/messages/',
  UNREAD_COUNTS: '/chats/unread-counts/',
  
  // Messages
  CREATE_MESSAGE: '/messages/create/',
  MESSAGE_DETAIL: '/messages/{id}/',
  FORWARD_MESSAGE: '/messages/{id}/forward/',
  MESSAGE_REACTIONS: '/messages/{id}/reactions/',
  REMOVE_REACTION: '/messages/{id}/reactions/{emoji}/',
  
  // Media
  MEDIA_UPLOAD: '/media/upload/',
  MEDIA_DOWNLOAD: '/media/{id}/download/',
  MEDIA_INFO: '/media/{id}/info/',
  CHAT_MEDIA: '/media/chat/{id}/',
  
  // Calls
  CALLS: '/calls/',
  CALL_DETAIL: '/calls/{id}/',
  ACTIVE_CALLS: '/calls/active/',
  JOIN_CALL: '/calls/{id}/join/',
  LEAVE_CALL: '/calls/{id}/leave/',
  END_CALL: '/calls/{id}/end/',
  TOGGLE_MUTE: '/calls/{id}/toggle-mute/',
  TOGGLE_VIDEO: '/calls/{id}/toggle-video/',
  CALL_PARTICIPANTS: '/calls/{id}/participants/',
  LOG_CALL_QUALITY: '/calls/{id}/quality/log/',
  CALL_QUALITY_LOGS: '/calls/{id}/quality/logs/',
  CALL_QUALITY_REPORT: '/calls/{id}/quality/report/',
  
  // Statistics
  USER_STATISTICS: '/statistics/',
  
  // Health
  HEALTH_CHECK: '/health/',
} as const;

export type APIEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MESSAGES_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;