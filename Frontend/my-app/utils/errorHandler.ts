// utils/errorHandler.ts
import type { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  field?: string;
  code?: string;
}

/**
 * Extract error message from API response
 * Handles various error response formats from Django REST Framework
 */
export function extractErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  // Try to get error from response data
  if (error.response?.data) {
    const data = error.response.data;
    
    // Check for error field (custom backend format)
    if (data.error) {
      return data.error;
    }
    
    // Check for message field
    if (data.message) {
      return data.message;
    }
    
    // Check for detail field (DRF default)
    if (data.detail) {
      if (typeof data.detail === 'object') {
        // Handle nested validation errors
        const errors: string[] = [];
        for (const [field, messages] of Object.entries(data.detail)) {
          if (Array.isArray(messages)) {
            errors.push(`${field}: ${messages.join(', ')}`);
          } else {
            errors.push(`${field}: ${messages}`);
          }
        }
        return errors.join('. ');
      }
      return data.detail;
    }
    
    // Check for non_field_errors (DRF validation)
    if (data.non_field_errors) {
      return Array.isArray(data.non_field_errors) 
        ? data.non_field_errors.join('. ') 
        : data.non_field_errors;
    }
  }
  
  // Check for network errors
  if (error.message) {
    if (error.message.includes('Network Error')) {
      return 'Network error. Please check your connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timeout. Please try again.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }
    return error.message;
  }
  
  // Check for Axios specific errors
  if (error.code) {
    switch (error.code) {
      case 'ERR_NETWORK':
        return 'Network error. Please check your connection.';
      case 'ERR_TIMEOUT':
        return 'Request timeout. Please try again.';
      case 'ERR_BAD_RESPONSE':
        return 'Server returned an invalid response.';
      default:
        return `Error: ${error.code}`;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Extract field-level errors from validation response
 * Returns an object mapping field names to error messages
 */
export function extractFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  if (!error?.response?.data) return fieldErrors;
  
  const data = error.response.data;
  
  // Handle DRF validation errors in detail object
  if (data.detail && typeof data.detail === 'object') {
    for (const [field, messages] of Object.entries(data.detail)) {
      if (Array.isArray(messages)) {
        fieldErrors[field] = messages.join(', ');
      } else {
        fieldErrors[field] = String(messages);
      }
    }
  }
  
  // Handle non_field_errors separately
  if (data.non_field_errors) {
    fieldErrors['general'] = Array.isArray(data.non_field_errors)
      ? data.non_field_errors.join('. ')
      : String(data.non_field_errors);
  }
  
  return fieldErrors;
}

/**
 * Handle API errors with proper error extraction
 * Can be used in try-catch blocks to extract and throw meaningful errors
 */
export function handleApiError(error: any): never {
  const message = extractErrorMessage(error);
  const fieldErrors = extractFieldErrors(error);
  
  const apiError: ApiError & { fieldErrors?: Record<string, string> } = {
    message,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
  
  throw apiError;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  if (error.message?.includes('Network Error')) return true;
  if (error.code === 'ERR_NETWORK') return true;
  if (error.code === 'ECONNREFUSED') return true;
  
  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  if (!error) return false;
  
  if (error.message?.includes('timeout')) return true;
  if (error.code === 'ERR_TIMEOUT') return true;
  if (error.code === 'ECONNABORTED') return true;
  
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  if (!error?.response?.data) return false;
  
  const data = error.response.data;
  const status = error.response.status;
  
  // HTTP 400 typically indicates validation errors
  if (status === 400) return true;
  
  // Check for validation error structure
  if (data.detail && typeof data.detail === 'object') return true;
  if (data.non_field_errors) return true;
  
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  if (!error?.response) return false;
  
  return error.response.status === 401;
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: any): boolean {
  if (!error?.response) return false;
  
  return error.response.status === 403;
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(error: any): boolean {
  if (!error?.response) return false;
  
  return error.response.status === 404;
}
