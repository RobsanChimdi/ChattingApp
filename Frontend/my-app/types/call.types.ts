import { User } from './user.types';
import { Chat } from './chat.types';

export type CallType = 'audio' | 'video';
export type CallStatus = 'initiated' | 'ongoing' | 'completed' | 'missed' | 'rejected' | 'failed';

export interface Call {
  id: string;
  chat_id: string;
  chat?: Chat; // Optional if you have the Chat type
  initiated_by: User;
  call_type: 'audio' | 'video';
  status: CallStatus; // Use the specific type
  started_at: string;
  ended_at?: string;
  call_duration?: number;
  participants?: CallParticipant[];
  created_at: string;
  updated_at: string;
}

export interface CallParticipant {
  id: string;
  call: string;
  user: User;
  role: 'initiator' | 'participant';
  joined_at: string;
  left_at?: string;
  is_muted: boolean;
  has_video: boolean;
}

export interface CallQuality {
  id: string;
  call_id: string;
  participant?: CallParticipant;
  audio_level: number;
  video_bitrate: number;
  audio_bitrate: number;
  packet_loss: number;
  jitter: number;
  round_trip_time: number;
  timestamp: string;
}

export interface CallQualityReport {
  call_id: string;
  average_quality: {
    audio_level: number;
    video_bitrate: number;
    packet_loss: number;
    jitter: number;
  };
  participant_reports: {
    [participant_id: string]: CallQuality[];
  };
  recommendations?: string[];
}

export interface CallCreateData {
  chat: string;
  call_type: CallType;
}

export interface CallJoinData {
  call_id: string;
}

export interface CallUpdateData {
  status?: CallStatus;
  call_duration?: number;
  metadata?: Record<string, any>;
}

export interface CallStatistics {
  total_calls: number;
  total_duration: number;
  average_duration: number;
  call_types: {
    audio: number;
    video: number;
  };
  call_statuses: {
    completed: number;
    missed: number;
    rejected: number;
  };
  busiest_hours: {
    [hour: string]: number;
  };
}