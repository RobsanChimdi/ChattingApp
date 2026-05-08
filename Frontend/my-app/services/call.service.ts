// services/call.service.ts
import { api } from './api';
import type { Call, CallCreateData, CallParticipant, CallQuality } from '@/types/call.types';

export const callService = {
  // Call management
  async createCall(data: CallCreateData): Promise<Call> {
    return await api.post<Call>('/calls/', data);
  },

  async getCall(callId: number): Promise<Call> {
    return await api.get<Call>(`/calls/${callId}/`);
  },

  async updateCall(callId: number, data: { status: string }): Promise<Call> {
    return await api.patch<Call>(`/calls/${callId}/`, data);
  },

  async joinCall(callId: number, enableVideo: boolean = true): Promise<CallParticipant> {
    return await api.post<CallParticipant>(`/calls/${callId}/join/`, { enable_video: enableVideo });
  },

  async leaveCall(callId: number): Promise<{ status: string }> {
    return await api.post<{ status: string }>(`/calls/${callId}/leave/`);
  },

  async endCall(callId: number): Promise<Call> {
    return await api.post<Call>(`/calls/${callId}/end/`);
  },

  // Call controls
  async toggleMute(callId: number): Promise<CallParticipant> {
    return await api.post<CallParticipant>(`/calls/${callId}/toggle-mute/`);
  },

  async toggleVideo(callId: number): Promise<CallParticipant> {
    return await api.post<CallParticipant>(`/calls/${callId}/toggle-video/`);
  },

  // Call info
  async getCallParticipants(callId: number): Promise<CallParticipant[]> {
    return await api.get<CallParticipant[]>(`/calls/${callId}/participants/`);
  },

  async getActiveCalls(): Promise<Call[]> {
    return await api.get<Call[]>('/calls/active/');
  },

  async getUserCalls(): Promise<Call[]> {
    return await api.get<Call[]>('/calls/');
  },

  // Call quality
  async logCallQuality(callId: number, data: Partial<CallQuality>): Promise<CallQuality> {
    return await api.post<CallQuality>(`/calls/${callId}/quality/log/`, data);
  },

  async getCallQualityLogs(callId: number): Promise<CallQuality[]> {
    return await api.get<CallQuality[]>(`/calls/${callId}/quality/logs/`);
  },

  async getCallQualityReport(callId: number): Promise<any> {
    return await api.get<any>(`/calls/${callId}/quality/report/`);
  },
};