import { api } from './api';
import type { Call, CallCreateData, CallParticipant } from '@/types/call.types';

export const callService = {
  // Call management
  async createCall(data: CallCreateData): Promise<Call> {
    const response = await api.post<Call>('/calls/create/', data);
    return response.data;
  },

  async joinCall(callId: string): Promise<CallParticipant> {
    const response = await api.post<CallParticipant>(`/calls/${callId}/join/`);
    return response.data;
  },

  async leaveCall(callId: string): Promise<void> {
    await api.post(`/calls/${callId}/leave/`);
  },

  async endCall(callId: string): Promise<Call> {
    const response = await api.post<Call>(`/calls/${callId}/end/`);
    return response.data;
  },

  // Call controls
  async toggleMute(callId: string): Promise<CallParticipant> {
    const response = await api.post<CallParticipant>(`/calls/${callId}/toggle-mute/`);
    return response.data;
  },

  async toggleVideo(callId: string): Promise<CallParticipant> {
    const response = await api.post<CallParticipant>(`/calls/${callId}/toggle-video/`);
    return response.data;
  },

  // Call info
  async getCall(callId: string): Promise<Call> {
    const response = await api.get<Call>(`/calls/${callId}/`);
    return response.data;
  },

  async getCallParticipants(callId: string): Promise<CallParticipant[]> {
    const response = await api.get<CallParticipant[]>(`/calls/${callId}/participants/`);
    return response.data;
  },

  async getActiveCalls(): Promise<Call[]> {
    const response = await api.get<Call[]>('/calls/active/');
    return response.data;
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