'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Plus,
  MessageSquare,
  Phone,
  Video,
  Loader2,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
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

export default function ContactsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
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
      const response = await api.get<any[]>('/contacts/');
      // Extract contact user data from the response
      const contactUsers = response.map((contact: any) => contact.contact_user);
      setContacts(contactUsers);
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
              <Card key={contact.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact.profile_image || undefined} />
                      <AvatarFallback>
                        {getDisplayName(contact).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {contact.is_online && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {getDisplayName(contact)}
                      </p>
                      <div className="flex items-center space-x-1">
                        {contact.is_online ? (
                          <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10">
                            <Radio className="h-3 w-3 mr-1 animate-pulse" />
                            Online
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {formatLastSeen(contact.last_seen)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {contact.bio || contact.email}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Message">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Audio Call">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Video Call">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
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
