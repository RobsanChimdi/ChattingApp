import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UserPlus, 
  MoreVertical, 
  MessageSquare, 
  Phone, 
  Video,
  Circle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Contact {
  id: number;
  username: string;
  email: string;
  profile_image?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen?: string;
  is_favorite?: boolean;
}

interface ContactsListProps {
  collapsed?: boolean;
  limit?: number;
  showActions?: boolean;
}

export function ContactsList({ 
  collapsed = false, 
  limit = 20,
  showActions = true 
}: ContactsListProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simulate loading contacts
    const timer = setTimeout(() => {
      const mockContacts: Contact[] = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        username: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        status: i % 4 === 0 ? 'online' : 
                i % 4 === 1 ? 'away' : 
                i % 4 === 2 ? 'busy' : 'offline',
        is_favorite: i < 3,
        last_seen: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }));
      setContacts(mockContacts);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  const filteredContacts = contacts
    .filter(contact => 
      contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, limit);

  if (collapsed) {
    return (
      <div className="space-y-2">
        {filteredContacts.slice(0, 8).map((contact) => (
          <div key={contact.id} className="flex justify-center">
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={contact.profile_image} />
                <AvatarFallback>
                  {contact.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-1 -right-1 h-2 w-2 rounded-full border border-background",
                getStatusColor(contact.status)
              )} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Contacts ({filteredContacts.length})
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <UserPlus className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-1 pr-2">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.profile_image} />
                    <AvatarFallback>
                      {contact.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background",
                    getStatusColor(contact.status)
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium truncate">{contact.username}</p>
                    {contact.is_favorite && (
                      <Badge variant="outline" className="h-4 px-1 text-xs">
                        ★
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {getStatusText(contact.status)}
                  </p>
                </div>
              </div>

              {showActions && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Phone className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Video className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}