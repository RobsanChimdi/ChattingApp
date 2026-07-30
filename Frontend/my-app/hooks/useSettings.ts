import { useState, useCallback } from 'react';
import { settingsService, UpdateProfileData } from '@/services/settings.service';
import type { SettingsFormData } from '@/types/settings.types';

export const useSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(async (data: FormData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await settingsService.updateProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      return await settingsService.getProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    updateProfile,
    getProfile,
    clearError: () => setError(null)
  };
};
