'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Loader2,
  Radio,
  X
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

export default function AddContactPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedContacts, setAddedContacts] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      loadExistingContacts();
    }
  }, [isAuthenticated]);

  const loadExistingContacts = async () => {
    try {
      const response = await api.get<any[]>('/contacts/');
      setAddedContacts(new Set(response.map((c: any) => c.contact_user.id)));
    } catch (error) {
      console.error('Failed to load existing contacts:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get<Contact[]>(`/users/search/?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response);
    } catch (error) {
      console.error('Failed to search users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async (contactId: number) => {
    try {
      await api.post('/contacts/', { contact_id: contactId });
      setAddedContacts(prev => new Set([...prev, contactId]));
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const handleRemoveContact = async (contactId: number) => {
    try {
      await api.delete(`/contacts/${contactId}/`);
      setAddedContacts(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to remove contact:', error);
    }
  };

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

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Contact</h1>
          <p className="text-muted-foreground mt-1">
            Search for users to add to your contacts
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-6 mb-6">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold mb-4">Search Results</h2>
          {searchResults
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
                    {addedContacts.has(contact.id) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveContact(contact.id)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddContact(contact.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Contact
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {searchResults.length === 0 && searchQuery && !isSearching && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            No users found matching "{searchQuery}"
          </p>
        </div>
      )}

      {!searchQuery && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-2">
            Enter a username or email to search for users
          </p>
        </div>
      )}
    </div>
  );
}
