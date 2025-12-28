// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// Message Status
export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

export type MessageStatusType = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];

// Chat Types
export const CHAT_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group',
} as const;

export type ChatType = typeof CHAT_TYPES[keyof typeof CHAT_TYPES];

// Call Types
export const CALL_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;

export type CallType = typeof CALL_TYPES[keyof typeof CALL_TYPES];

// Call Status
export const CALL_STATUS = {
  INITIATED: 'initiated',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  MISSED: 'missed',
  REJECTED: 'rejected',
  FAILED: 'failed',
} as const;

export type CallStatus = typeof CALL_STATUS[keyof typeof CALL_STATUS];

// User Status
export const USER_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// Privacy Settings
export const PRIVACY_SETTINGS = {
  EVERYONE: 'everyone',
  CONTACTS: 'contacts',
  NOBODY: 'nobody',
} as const;

export type PrivacySetting = typeof PRIVACY_SETTINGS[keyof typeof PRIVACY_SETTINGS];

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MESSAGES_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

// Socket Events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Chat
  NEW_MESSAGE: 'new_message',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_REACTION: 'message_reaction',
  TYPING_START: 'typing_start',
  TYPING_END: 'typing_end',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  
  // Chat Management
  CHAT_CREATED: 'chat_created',
  CHAT_UPDATED: 'chat_updated',
  PARTICIPANT_ADDED: 'participant_added',
  PARTICIPANT_REMOVED: 'participant_removed',
  
  // Call
  INCOMING_CALL: 'incoming_call',
  CALL_ACCEPTED: 'call_accepted',
  CALL_REJECTED: 'call_rejected',
  CALL_ENDED: 'call_ended',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
  PARTICIPANT_MUTED: 'participant_muted',
  PARTICIPANT_VIDEO_TOGGLED: 'participant_video_toggled',
  
  // User Status
  USER_ONLINE_STATUS: 'user_online_status',
  
  // WebRTC
  WEBRTC_SIGNAL: 'webrtc_signal',
  CALL_QUALITY_UPDATE: 'call_quality_update',
  
  // Custom
  SOCKET_CONNECTED: 'socket:connected',
  SOCKET_DISCONNECTED: 'socket:disconnected',
  SOCKET_CONNECTION_FAILED: 'socket:connection_failed',
  SOCKET_ERROR: 'socket:error',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  REGISTER: '/register/',
  LOGIN: '/login/',
  LOGOUT: '/logout/',
  WEBSOCKET_TOKEN: '/websocket-token/',
  
  // Users
  CURRENT_USER: '/users/me/',
  UPDATE_PROFILE: '/users/me/update/',
  USER_SEARCH: '/users/search/',
  USER_ONLINE_STATUS: '/users/{id}/online-status/',
  UPDATE_LAST_SEEN: '/update-last-seen/',
  SET_OFFLINE: '/set-offline/',
  
  // Chats
  CHATS: '/chats/',
  CREATE_PRIVATE_CHAT: '/chats/create-private/',
  ADD_PARTICIPANT: '/chats/{id}/add-participant/',
  REMOVE_PARTICIPANT: '/chats/{id}/remove-participant/',
  LEAVE_CHAT: '/chats/{id}/leave/',
  UPDATE_CHAT_INFO: '/chats/{id}/update/',
  CHAT_MESSAGES: '/chats/{id}/messages/',
  UNREAD_COUNTS: '/unread-counts/',
  
  // Messages
  MESSAGES: '/messages/',
  EDIT_MESSAGE: '/messages/{id}/edit/',
  DELETE_MESSAGE: '/messages/{id}/delete/',
  REACT_TO_MESSAGE: '/messages/{id}/react/',
  REMOVE_REACTION: '/messages/{id}/remove-reaction/',
  FORWARD_MESSAGE: '/messages/{id}/forward/',
  MARK_MESSAGE_READ: '/messages/{id}/mark-read/',
  MARK_ALL_READ: '/messages/mark-all-read/',
  SEARCH_MESSAGES: '/messages/search/',
  
  // Media
  MEDIA_UPLOAD: '/media/upload/',
  MEDIA_DOWNLOAD: '/media/{id}/download/',
  CHAT_MEDIA: '/media/chat-media/',
  
  // Calls
  CALLS_CREATE: '/calls/create/',
  CALL_JOIN: '/calls/{id}/join/',
  CALL_LEAVE: '/calls/{id}/leave/',
  CALL_END: '/calls/{id}/end/',
  TOGGLE_MUTE: '/calls/{id}/toggle-mute/',
  TOGGLE_VIDEO: '/calls/{id}/toggle-video/',
  CALL_PARTICIPANTS: '/calls/{id}/participants/',
  ACTIVE_CALLS: '/calls/active/',
  LOG_CALL_QUALITY: '/calls/{id}/quality/',
  CALL_QUALITY_REPORT: '/calls/{id}/quality-report/',
  
  // Statistics
  USER_STATISTICS: '/statistics/',
  
  // Health
  HEALTH_CHECK: '/health/',
} as const;