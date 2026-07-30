'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactCard } from '@/components/contacts/contact-card';
import {
  Users,
  Search,
  Plus,
  Loader2
} from 'lucide-react';
import type { Contact } from '@/types/contacts.types';
import { api } from '@/services/api';

export default function ContactsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { getContacts } = useContacts();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadContacts();
    }
  }, [isAuthenticated]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const loadedContacts = await getContacts();
      setContacts(loadedContacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Unknown';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getDisplayName = (contact: Contact) => {
    if (contact.first_name && contact.last_name) {
      return `${contact.first_name} ${contact.last_name}`;
    }
    return contact.username;
  };

  const handleMessage = async (contact: Contact) => {
    try {
      const response = await api.post<any>('/chats/private/create/', {
        participant_id: contact.id
      });
      router.push(`/dashboard/chat/${response.id}`);
    } catch (error) {
      console.error('Failed to create/get chat:', error);
    }
  };

  const handleCall = async (contact: Contact, type: 'audio' | 'video') => {
    try {
      const response = await api.post<any>('/chats/private/create/', {
        participant_id: contact.id
      });
      router.push(`/dashboard/call/setup?chat=${response.id}&type=${type}`);
    } catch (error) {
      console.error('Failed to create/get chat for call:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Your contacts ({contacts.length})
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/contacts/add')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="space-y-2">
        {filteredContacts.length > 0 ? (
          filteredContacts
            .filter((contact) => contact.id !== user?.id)
            .map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onMessage={handleMessage}
                onCall={handleCall}
                getDisplayName={getDisplayName}
                formatLastSeen={formatLastSeen}
              />
            ))
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-2">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/dashboard/contacts/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first contact
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
