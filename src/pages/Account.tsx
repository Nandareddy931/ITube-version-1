import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { LogOut, Settings, Moon, Sun, Lock, HelpCircle, LogIn, Bell } from 'lucide-react';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

export default function Account() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchProfile();
    // Check dark mode preference
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
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
      setSigningOut(false);
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
    navigate(`/channel/${user?.id}`);
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

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (loading || !profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  const displayName = profile.display_name || user.email?.split('@')[0] || 'User';
  const avatarFallback = displayName.substring(0, 2).toUpperCase();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{displayName}</CardTitle>
                  <CardDescription className="mt-1">{user.email}</CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleSettingsClick}
                size="sm"
              >
                <Settings className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Account Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto px-4 py-3"
              onClick={handleChannelClick}
            >
              <div className="flex items-center gap-3 w-full">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Your Channel</p>
                  <p className="text-xs text-muted-foreground">View and manage your channel</p>
                </div>
              </div>
            </Button>

            <Separator />

            <Button
              variant="ghost"
              className="w-full justify-start h-auto px-4 py-3"
              onClick={handleSettingsClick}
            >
              <div className="flex items-center gap-3 w-full">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">Manage your account settings</p>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto px-4 py-3"
              onClick={handleThemeToggle}
            >
              <div className="flex items-center gap-3 w-full">
                {darkMode ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="text-left flex-1">
                  <p className="font-medium">Appearance</p>
                  <p className="text-xs text-muted-foreground">
                    {darkMode ? 'Dark mode' : 'Light mode'} enabled
                  </p>
                </div>
              </div>
            </Button>

            <Separator />

            <Button
              variant="ghost"
              className="w-full justify-start h-auto px-4 py-3 text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-3 w-full">
                <Bell className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Support & Safety */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Support & Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto px-4 py-3"
              onClick={handlePrivacyClick}
            >
              <div className="flex items-center gap-3 w-full">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Privacy & Safety</p>
                  <p className="text-xs text-muted-foreground">Control your privacy settings</p>
                </div>
              </div>
            </Button>

            <Separator />

            <Button
              variant="ghost"
              className="w-full justify-start h-auto px-4 py-3"
              onClick={handleHelpClick}
            >
              <div className="flex items-center gap-3 w-full">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Help & Feedback</p>
                  <p className="text-xs text-muted-foreground">Get support or send feedback</p>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <Button
              onClick={handleLogout}
              disabled={signingOut}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
