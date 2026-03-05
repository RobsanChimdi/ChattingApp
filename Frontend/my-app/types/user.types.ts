// types/user.types.ts
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image: string | null;
  profile_image_url?: string | null;
  bio: string;
  phone_number?: string;
  status: string;
  privacy_last_seen: 'everyone' | 'contacts' | 'nobody';
  last_seen: string | null;
  is_online: boolean;
  is_verified: boolean;
  date_joined: string;
}

export interface UserProfile extends Omit<User, 'password' | 'is_superuser' | 'is_staff'> {
  phone_number?: string;
  location?: string;
  website?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

export interface UserOnlineStatus {
  is_online: boolean;
  last_seen?: string;
  status?: string;
  privacy?: 'hidden' | 'contacts_only';
}

export interface UserStatistics {
  user: {
    username: string;
    date_joined: string;
    last_login: string;
    last_seen: string;
    is_online: boolean;
  };
  messages: {
    total: number;
    sent_today: number;
    recent_week: number;
  };
  chats: {
    total: number;
    private: number;
    group: number;
  };
  calls: {
    total: number;
    total_duration_seconds: number;
    total_duration_hours: number;
  };
}

// Authentication
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WebSocketToken {
  token: string;
  user_id: number;
  username: string;
}

export interface UserSearchResult {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  is_online: boolean;
  last_seen: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  privacy_last_seen?: 'everyone' | 'contacts' | 'nobody';
}