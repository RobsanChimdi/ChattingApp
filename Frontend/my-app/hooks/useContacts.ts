import { useState, useCallback } from 'react';
import { contactsService } from '@/services/contacts.service';
import type { Contact, ContactResponse } from '@/types/contacts.types';

export const useContacts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getContacts = useCallback(async (): Promise<Contact[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await contactsService.getContacts();
      // Extract contact user data from the response
      const contactUsers = response.map((contact: ContactResponse) => contact.contact_user);
      // Remove duplicates based on contact ID
      const uniqueContacts = contactUsers.filter((contact: Contact, index: number, self: Contact[]) =>
        index === self.findIndex((c: Contact) => c.id === contact.id)
      );
      return uniqueContacts;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contacts');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addContact = useCallback(async (contactId: number): Promise<ContactResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      return await contactsService.addContact(contactId);
    } catch (err: any) {
      setError(err.message || 'Failed to add contact');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeContact = useCallback(async (contactId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await contactsService.removeContact(contactId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove contact');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await contactsService.searchUsers(query);
    } catch (err: any) {
      setError(err.message || 'Failed to search users');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getContacts,
    addContact,
    removeContact,
    searchUsers,
    clearError: () => setError(null)
  };
};
