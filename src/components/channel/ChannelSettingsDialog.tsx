import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
}

interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onProfileUpdate: (profile: Profile) => void;
}

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  profile,
  onProfileUpdate,
}: ChannelSettingsDialogProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [description, setDescription] = useState(profile.description || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setBannerUrl(publicUrl);
      toast.success('Banner uploaded successfully');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          description,
          avatar_url: avatarUrl || null,
          banner_url: bannerUrl || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      onProfileUpdate({
        ...profile,
        display_name: displayName,
        description,
        avatar_url: avatarUrl || null,
        banner_url: bannerUrl || null,
      });

      toast.success('Channel updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update channel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Banner Upload */}
          <div className="space-y-2">
            <Label>Channel Banner</Label>
            <div className="relative h-24 rounded-lg overflow-hidden bg-secondary">
              {bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/30 to-primary/10" />
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingBanner ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Camera className="h-6 w-6" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                />
              </label>
            </div>
          </div>

          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {displayName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Click to upload a new profile picture
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Channel Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your channel name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your channel"
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
