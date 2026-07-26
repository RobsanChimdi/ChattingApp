'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { callService } from '@/services/call.service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Call } from '@/types/call.types';
import {
  Phone,
  Video,
  Search,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneOff,
  Clock,
  Loader2,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CallsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing' | 'missed'>('all');

  useEffect(() => {
    if (isAuthenticated) {
      loadCalls();
    }
  }, [isAuthenticated]);

  const loadCalls = async () => {
    setIsLoading(true);
    try {
      const callsData = await callService.getUserCalls();
      setCalls(callsData);
    } catch (error) {
      console.error('Failed to load calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallDisplay = (call: Call) => {
    const isInitiator = call.initiated_by === user?.id;
    const isMissed = call.status === 'missed' || call.status === 'rejected';
    
    if (isMissed && !isInitiator) {
      return { icon: PhoneOff, color: 'text-red-500', direction: 'missed' };
    } else if (isInitiator) {
      return { icon: PhoneOutgoing, color: 'text-blue-500', direction: 'outgoing' };
    } else {
      return { icon: PhoneIncoming, color: 'text-green-500', direction: 'incoming' };
    }
  };

  const filteredCalls = calls.filter((call) => {
    const otherParticipant = call.participants?.find((p) => p.user.id !== user?.id);
    const matchesSearch = otherParticipant?.user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const { direction } = getCallDisplay(call);
    const matchesFilter = filter === 'all' || direction === filter;
    
    return matchesSearch && matchesFilter;
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading calls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calls</h1>
          <p className="text-muted-foreground mt-1">
            Your call history
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/call/setup')}>
          <Video className="h-4 w-4 mr-2" />
          New Call
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'incoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('incoming')}
          >
            <PhoneIncoming className="h-4 w-4 mr-1" />
            Incoming
          </Button>
          <Button
            variant={filter === 'outgoing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('outgoing')}
          >
            <PhoneOutgoing className="h-4 w-4 mr-1" />
            Outgoing
          </Button>
          <Button
            variant={filter === 'missed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('missed')}
          >
            <PhoneOff className="h-4 w-4 mr-1" />
            Missed
          </Button>
        </div>
      </div>

      {/* Call List */}
      <div className="space-y-2">
        {filteredCalls.length > 0 ? (
          filteredCalls.map((call) => {
            const otherParticipant = call.participants?.find((p) => p.user.id !== user?.id);
            const { icon: CallIcon, color } = getCallDisplay(call);
            
            return (
              <Card key={call.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParticipant?.user.profile_image || undefined} />
                    <AvatarFallback>
                      {otherParticipant?.user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {otherParticipant?.user.username || 'Unknown'}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(call.started_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <CallIcon className={cn("h-3 w-3", color)} />
                      <span className="text-xs text-muted-foreground">
                        {call.call_type === 'video' ? '📹' : '🎤'} {call.call_type} call
                      </span>
                      {call.call_duration && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(call.call_duration)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-2">
              {searchQuery ? 'No calls found' : 'No calls yet'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/dashboard/call/setup')}>
                <Video className="h-4 w-4 mr-2" />
                Start a call
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
