export interface SettingsFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string;
  phone_number: string;
  status: string;
  privacy_last_seen: 'everyone' | 'contacts' | 'nobody';
}

export type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'security';

export interface SettingsTabItem {
  id: SettingsTab;
  label: string;
  icon: any;
}
