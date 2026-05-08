// call.types.ts
import { User } from './user.types';
import { Chat } from './chat.types';

export type CallType = 'audio' | 'video';
export type CallStatus = 'initiated' | 'ongoing' | 'completed' | 'missed' | 'rejected';

export interface Call {
  id: number;
  chat: number;
  chat_info?: {
    id: number;
    name?: string;
    chat_type: 'private' | 'group';
  };
  call_type: CallType;
  status: CallStatus;
  started_at: string;
  ended_at?: string;
  call_duration?: number;
  duration_seconds?: number;
  initiated_by: number;
  initiated_by_info?: {
    id: number;
    username: string;
    display_name: string;
    profile_image?: string;
  };
  is_group_call: boolean;
  is_ongoing: boolean;
  participants?: CallParticipant[];
  participant_count: number;
  active_participant_count: number;
  quality_logs?: CallQuality[];
}

export interface CallParticipant {
  id: number;
  call: number;
  user: User;  // Changed from number to User object
  role: 'initiator' | 'caller' | 'callee' | 'participant';
  joined_at: string;
  left_at?: string;
  is_muted: boolean;
  is_video_enabled: boolean;
  has_video: boolean;
  is_speaking: boolean;
  duration?: number;
}

// For cases where you need just the user ID (API requests)
export interface CallParticipantCreate {
  call: number;
  user: number;
  role?: 'initiator' | 'caller' | 'callee' | 'participant';
  is_muted?: boolean;
  is_video_enabled?: boolean;
}

export interface CallQuality {
  id: number;
  call: number;
  participant?: number;
  latency_ms: number;
  jitter_ms: number;
  packet_loss: number;
  bitrate_kbps?: number;
  audio_bitrate?: number;
  video_bitrate?: number;
  audio_level?: number;
  quality_status: 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
  is_good_quality: boolean;
  is_poor_quality: boolean;
  measured_at: string;
}

export interface CallQualityReport {
  summary: {
    average_latency_ms: number | null;
    average_jitter_ms: number | null;
    average_packet_loss: number | null;
    average_bitrate_kbps: number | null;
    average_audio_bitrate: number | null;
    average_video_bitrate: number | null;
    average_audio_level: number | null;
    total_logs: number;
  };
  status_distribution: Array<{ quality_status: string; count: number }>;
  trends: Array<{
    measured_at: string;
    latency_ms: number;
    jitter_ms: number;
    packet_loss: number;
    audio_bitrate?: number;
    video_bitrate?: number;
    audio_level?: number;
    quality_status: string;
  }>;
  best_log: CallQuality | null;
  worst_log: CallQuality | null;
}

export interface CallCreateData {
  chat: number;
  call_type: CallType;
  is_group_call?: boolean;
}

export interface CallJoinData {
  enable_video?: boolean;
  user_id?: number;
}

export interface CallUpdateData {
  status?: CallStatus;
}

export interface CallStatistics {
  total_calls: number;
  total_duration_seconds: number;
  total_duration_hours: number;
  call_types: {
    audio: number;
    video: number;
  };
  call_statuses: {
    completed: number;
    missed: number;
    rejected: number;
  };
}