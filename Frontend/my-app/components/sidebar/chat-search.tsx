import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSearchProps {
  collapsed?: boolean;
  placeholder?: string;
  onSearch?: (query: string) => void;
  showFilters?: boolean;
  className?: string;
}

export function ChatSearch({
  collapsed = false,
  placeholder = "Search chats...",
  onSearch,
  showFilters = true,
  className
}: ChatSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    setQuery('');
    onSearch?.('');
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-10 w-10", className)}
        onClick={() => setIsFocused(true)}
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="pl-10 pr-10"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-10 top-1/2 transform -translate-y-1/2 h-6 w-6"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      {showFilters && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
        >
          <Filter className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}