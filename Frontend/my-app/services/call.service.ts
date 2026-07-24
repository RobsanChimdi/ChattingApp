// services/call.service.ts
import { api } from './api';
import type { Call, CallCreateData, CallParticipant, CallQuality } from '@/types/call.types';
import { extractErrorMessage } from '@/utils/errorHandler';

export const callService = {
  // Call management
  async createCall(data: CallCreateData): Promise<Call> {
    try {
      return await api.post<Call>('/calls/', data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getCall(callId: number): Promise<Call> {
    try {
      return await api.get<Call>(`/calls/${callId}/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async updateCall(callId: number, data: { status: string }): Promise<Call> {
    try {
      return await api.patch<Call>(`/calls/${callId}/`, data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async joinCall(callId: number, enableVideo: boolean = true): Promise<CallParticipant> {
    try {
      return await api.post<CallParticipant>(`/calls/${callId}/join/`, { enable_video: enableVideo });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async leaveCall(callId: number): Promise<{ status: string }> {
    try {
      return await api.post<{ status: string }>(`/calls/${callId}/leave/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async endCall(callId: number): Promise<Call> {
    try {
      return await api.post<Call>(`/calls/${callId}/end/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Call controls
  async toggleMute(callId: number): Promise<CallParticipant> {
    try {
      return await api.post<CallParticipant>(`/calls/${callId}/toggle-mute/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async toggleVideo(callId: number): Promise<CallParticipant> {
    try {
      return await api.post<CallParticipant>(`/calls/${callId}/toggle-video/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Call info
  async getCallParticipants(callId: number): Promise<CallParticipant[]> {
    try {
      return await api.get<CallParticipant[]>(`/calls/${callId}/participants/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getActiveCalls(): Promise<Call[]> {
    try {
      return await api.get<Call[]>('/calls/active/');
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getUserCalls(): Promise<Call[]> {
    try {
      return await api.get<Call[]>('/calls/');
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Call quality
  async logCallQuality(callId: number, data: Partial<CallQuality>): Promise<CallQuality> {
    try {
      return await api.post<CallQuality>(`/calls/${callId}/quality/log/`, data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getCallQualityLogs(callId: number): Promise<CallQuality[]> {
    try {
      return await api.get<CallQuality[]>(`/calls/${callId}/quality/logs/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getCallQualityReport(callId: number): Promise<any> {
    try {
      return await api.get<any>(`/calls/${callId}/quality/report/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
};