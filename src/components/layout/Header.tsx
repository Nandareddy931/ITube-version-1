import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, Upload, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AccountSettingsMenu } from '@/components/AccountSettingsMenu';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLFormElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowMobileSearch(false);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (query: string) => {
    setSearchQuery(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setShowSuggestions(false);
    setShowMobileSearch(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-2 sm:px-4 bg-background/95 backdrop-blur-sm border-b border-border">
      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="absolute inset-0 bg-background z-50 flex flex-col">
          <div className="flex items-center px-2 gap-2 h-14">
            <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(false)}>
              <X className="h-5 w-5" />
            </Button>
            <form onSubmit={handleSearch} className="flex-1 flex relative">
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-secondary"
                autoFocus
              />
              <Button type="submit" variant="ghost" size="icon" className="ml-1">
                <Search className="h-5 w-5" />
              </Button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            <SearchSuggestions 
              query={searchQuery}
              onSelect={handleSuggestionSelect}
              visible={true}
              className="relative mt-0 border-0 shadow-none"
            />
          </div>
        </div>
      )}

      {/* Left section */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuToggle} className="shrink-0 hidden md:flex">
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/" className="flex items-center gap-1">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary-foreground fill-current">
              <path d="M10 8l6 4-6 4V8z" />
            </svg>
          </div>
          <span className="text-lg sm:text-xl font-bold">VidStream</span>
        </Link>
      </div>

      {/* Center section - Search (Desktop) */}
      <form 
        ref={searchContainerRef}
        onSubmit={handleSearch} 
        className="flex-1 max-w-2xl mx-4 hidden md:flex relative"
      >
        <div className="flex w-full">
          <Input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={(e) => {
              // Delay hiding to allow clicks on suggestions
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className="rounded-r-none border-r-0 bg-secondary focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button 
            type="submit" 
            variant="secondary" 
            className="rounded-l-none border border-l-0 border-border px-6"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <SearchSuggestions 
          query={searchQuery}
          onSelect={handleSuggestionSelect}
          visible={showSuggestions}
        />
      </form>

      {/* Right section */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMobileSearch(true)}>
          <Search className="h-5 w-5" />
        </Button>
        
        {user ? (
          <>
            <Link to="/upload" className="hidden sm:block">
              <Button variant="ghost" size="icon">
                <Upload className="h-5 w-5" />
              </Button>
            </Link>
            <NotificationBell />
            <AccountSettingsMenu />
          </>
        ) : (
          <Link to="/auth">
            <Button variant="outline" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
