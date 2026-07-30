import { api } from './api';

export interface UpdateProfileData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string;
  phone_number: string;
  status: string;
  privacy_last_seen: string;
  profile_image?: File;
}

export const settingsService = {
  async updateProfile(data: FormData): Promise<any> {
    try {
      return await api.upload('/users/me/update/', data);
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  },

  async getProfile(): Promise<any> {
    try {
      return await api.get('/users/me/');
    } catch (error) {
      throw new Error('Failed to fetch profile');
    }
  }
};
