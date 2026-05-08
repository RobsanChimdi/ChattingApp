export interface MessageMedia {
  id: string;
  message_id: string;
  file_url: string;
  thumbnail?: string;
  file_name: string;
  file_size: number;
  download_url: string;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  uploaded_at: string;
}

export interface MediaUploadData {
  chat_id?: string;
  message?: string;
  file: File;
}

export interface MediaDownloadInfo {
  url: string;
  download_url: string;
  file_name: string;
}

export interface MediaUploadResponse {
  id: string;
  url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface ChatMediaItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnail?: string;
  file_name: string;
  uploaded_at: string;
  sender_id: number;
  message_id?: string;
}