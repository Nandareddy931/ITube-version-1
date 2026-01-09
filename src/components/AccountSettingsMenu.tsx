import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Moon, Sun, Bell, Lock, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * @deprecated Use the Account page at /account instead
 * This component is maintained for backward compatibility but will be removed in a future version.
 * To migrate: Replace AccountSettingsMenu with a link to the Account page.
 */
export function AccountSettingsMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      // Check dark mode preference
      const isDark = localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setDarkMode(isDark);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut();
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast({
      title: 'Theme updated',
      description: `Switched to ${newDarkMode ? 'dark' : 'light'} mode.`,
    });
  };

  const handleChannelClick = () => {
    navigate(`/channel/${user.id}`);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handlePrivacyClick = () => {
    navigate('/settings?tab=privacy');
  };

  const handleHelpClick = () => {
    toast({
      title: 'Help Center',
      description: 'Help center coming soon.',
    });
  };

  if (!user || !profile) {
    return null;
  }

  const displayName = profile.display_name || user.email?.split('@')[0] || 'User';
  const avatarFallback = displayName.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full overflow-hidden h-10 w-10 hover:ring-2 ring-primary transition-all">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {/* User Info Section */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Navigation Items */}
        <DropdownMenuItem onClick={handleChannelClick} className="gap-2">
          <Settings className="h-4 w-4" />
          <span>View channel</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleSettingsClick} className="gap-2">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme Toggle */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>Appearance</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuCheckboxItem
              checked={!darkMode}
              onCheckedChange={() => !darkMode && handleThemeToggle()}
            >
              Light mode
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={darkMode}
              onCheckedChange={() => darkMode && handleThemeToggle()}
            >
              Dark mode
            </DropdownMenuCheckboxItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Notifications */}
        <DropdownMenuItem className="gap-2">
          <Bell className="h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>

        {/* Privacy & Safety */}
        <DropdownMenuItem onClick={handlePrivacyClick} className="gap-2">
          <Lock className="h-4 w-4" />
          <span>Privacy & safety</span>
        </DropdownMenuItem>

        {/* Help & Feedback */}
        <DropdownMenuItem onClick={handleHelpClick} className="gap-2">
          <HelpCircle className="h-4 w-4" />
          <span>Help</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={loading}
          className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
        >
          <LogOut className="h-4 w-4" />
          <span>{loading ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
