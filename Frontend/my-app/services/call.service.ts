import { api } from './api';
import type { Call, CallCreateData, CallParticipant } from '@/types/call.types';

export const callService = {
  // Call management
  async createCall(data: CallCreateData): Promise<Call> {
    return api.post<Call>('/calls/create/', data);
  },

  async joinCall(callId: string): Promise<CallParticipant> {
    return api.post<CallParticipant>(`/calls/${callId}/join/`);
  },

  async leaveCall(callId: string): Promise<void> {
    await api.post(`/calls/${callId}/leave/`);
  },

  async endCall(callId: string): Promise<Call> {
    return api.post<Call>(`/calls/${callId}/end/`);
  },

  // Call controls
  async toggleMute(callId: string): Promise<CallParticipant> {
    return api.post<CallParticipant>(`/calls/${callId}/toggle-mute/`);
  },

  async toggleVideo(callId: string): Promise<CallParticipant> {
    return api.post<CallParticipant>(`/calls/${callId}/toggle-video/`);
  },

  // Call info
  async getCall(callId: string): Promise<Call> {
    return api.get<Call>(`/calls/${callId}/`);
  },

  async getCallParticipants(callId: string): Promise<CallParticipant[]> {
    return api.get<CallParticipant[]>(`/calls/${callId}/participants/`);
  },

  async getActiveCalls(): Promise<Call[]> {
    return api.get<Call[]>('/calls/active/');
  },

  // Call quality
  async logCallQuality(callId: string, data: any): Promise<void> {
    await api.post(`/calls/${callId}/quality/`, data);
  },

  async getCallQualityReport(callId: string): Promise<any> {
    return api.get(`/calls/${callId}/quality-report/`);
  },

  // Statistics
  async getUserStatistics(): Promise<any> {
    return api.get('/statistics/');
  },
};