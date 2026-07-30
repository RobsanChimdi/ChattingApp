import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, Video, Radio } from 'lucide-react';
import type { Contact } from '@/types/contacts.types';

interface ContactCardProps {
  contact: Contact;
  onMessage: (contact: Contact) => void;
  onCall: (contact: Contact, type: 'audio' | 'video') => void;
  getDisplayName: (contact: Contact) => string;
  formatLastSeen: (lastSeen?: string) => string;
}

export function ContactCard({ 
  contact, 
  onMessage, 
  onCall, 
  getDisplayName, 
  formatLastSeen 
}: ContactCardProps) {
  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors">
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
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            title="Message"
            onClick={() => onMessage(contact)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            title="Audio Call"
            onClick={() => onCall(contact, 'audio')}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            title="Video Call"
            onClick={() => onCall(contact, 'video')}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
