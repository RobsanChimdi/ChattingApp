export interface Contact {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  bio?: string;
  is_online: boolean;
  last_seen?: string;
}

export interface ContactResponse {
  id: number;
  user: number;
  contact: number;
  contact_user: Contact;
  created_at: string;
}
