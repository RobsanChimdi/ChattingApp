import { api } from './api';
import type { Contact, ContactResponse } from '@/types/contacts.types';

export const contactsService = {
  async getContacts(): Promise<ContactResponse[]> {
    try {
      return await api.get<ContactResponse[]>('/contacts/');
    } catch (error) {
      throw new Error('Failed to fetch contacts');
    }
  },

  async addContact(contactId: number): Promise<ContactResponse> {
    try {
      return await api.post<ContactResponse>('/contacts/', { contact_id: contactId });
    } catch (error) {
      throw new Error('Failed to add contact');
    }
  },

  async removeContact(contactId: number): Promise<void> {
    try {
      await api.delete(`/contacts/${contactId}/`);
    } catch (error) {
      throw new Error('Failed to remove contact');
    }
  },

  async searchUsers(query: string): Promise<any[]> {
    try {
      return await api.get(`/users/search/?q=${query}`);
    } catch (error) {
      throw new Error('Failed to search users');
    }
  }
};
