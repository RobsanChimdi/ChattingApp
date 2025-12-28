import { MEDIA_TYPES, APP } from './constants';

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Get file type from mime type
 */
export const getFileType = (mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'unknown' => {
  if (MEDIA_TYPES.IMAGE.includes(mimeType as typeof MEDIA_TYPES.IMAGE[number])) return 'image';
  if (MEDIA_TYPES.VIDEO.includes(mimeType as typeof MEDIA_TYPES.VIDEO[number])) return 'video';
  if (MEDIA_TYPES.AUDIO.includes(mimeType as typeof MEDIA_TYPES.AUDIO[number])) return 'audio';
  if (MEDIA_TYPES.DOCUMENT.includes(mimeType as typeof MEDIA_TYPES.DOCUMENT[number])) return 'document';
  return 'unknown';
};

/**
 * Get file icon based on file type
 */
export const getFileIcon = (filename: string, mimeType?: string): string => {
  const extension = getFileExtension(filename);
  const type = mimeType ? getFileType(mimeType) : getFileType(`.${extension}`);
  
  switch (type) {
    case 'image':
      return '🖼️';
    case 'video':
      return '🎬';
    case 'audio':
      return '🎵';
    case 'document':
      if (['pdf'].includes(extension)) return '📄';
      if (['doc', 'docx'].includes(extension)) return '📝';
      if (['xls', 'xlsx'].includes(extension)) return '📊';
      if (['ppt', 'pptx'].includes(extension)) return '📽️';
      return '📎';
    default:
      return '📎';
  }
};

/**
 * Get user initials from name
 */
export const getUserInitials = (firstName?: string, lastName?: string, username?: string): string => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  
  if (firstName) {
    return firstName[0].toUpperCase();
  }
  
  if (username) {
    return username[0].toUpperCase();
  }
  
  return '?';
};

/**
 * Get user display name
 */
export const getUserDisplayName = (
  firstName?: string,
  lastName?: string,
  username?: string
): string => {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  if (firstName) {
    return firstName;
  }
  
  return username || 'Unknown User';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Generate random color from username
 */
export const getColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#FFD166', // Yellow
    '#06D6A0', // Green
    '#118AB2', // Blue
    '#EF476F', // Pink
    '#073B4C', // Dark Blue
    '#7209B7', // Purple
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Check if user is online based on last seen
 */
export const isUserOnline = (lastSeen: string, timeoutMinutes = 5): boolean => {
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const minutesAgo = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
  return minutesAgo < timeoutMinutes;
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 11) {
    return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
  }
  
  return phone;
};

/**
 * Create data URL from file
 */
export const createDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image file
 */
export const compressImage = async (
  file: File,
  maxWidth = 800,
  quality = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = reject;
    };
    
    reader.onerror = reject;
  });
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return successful;
    } catch (error) {
      console.error('Failed to copy text:', error);
      return false;
    }
  }
};

/**
 * Download file
 */
export const downloadFile = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate QR code data URL
 */
export const generateQRCodeDataURL = async (text: string): Promise<string> => {
  // This is a placeholder - in real implementation, use a QR code library
  const qrCodeSize = 200;
  const canvas = document.createElement('canvas');
  canvas.width = qrCodeSize;
  canvas.height = qrCodeSize;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');
  
  // Simple QR code-like pattern (for demo)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, qrCodeSize, qrCodeSize);
  ctx.fillStyle = '#000000';
  
  // Generate random pattern
  const cellSize = 10;
  for (let y = 0; y < qrCodeSize; y += cellSize) {
    for (let x = 0; x < qrCodeSize; x += cellSize) {
      if (Math.random() > 0.5) {
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }
  
  return canvas.toDataURL('image/png');
};