import { supabase } from "@/integrations/supabase/client";

export async function getChannelById(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, description, avatar_url, banner_url")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    name: data.display_name || "Unnamed Channel",
    description: data.description,
    avatarUrl: data.avatar_url,
    bannerUrl: data.banner_url,
    ownerId: data.id,
  };
}

export async function updateChannel(
  channelId: string,
  formData: FormData
) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const avatarFile = formData.get("avatar") as File | null;
  const bannerFile = formData.get("banner") as File | null;

  let avatarUrl: string | null = null;
  let bannerUrl: string | null = null;

  // Upload avatar if provided
  if (avatarFile) {
    const fileName = `${channelId}/avatar-${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from("channel-assets")
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("channel-assets")
      .getPublicUrl(fileName);
    avatarUrl = data.publicUrl;
  }

  // Upload banner if provided
  if (bannerFile) {
    const fileName = `${channelId}/banner-${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from("channel-assets")
      .upload(fileName, bannerFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("channel-assets")
      .getPublicUrl(fileName);
    bannerUrl = data.publicUrl;
  }

  // Update profile with new data
  const updateData: Record<string, any> = {
    display_name: name,
    description,
  };

  if (avatarUrl) updateData.avatar_url = avatarUrl;
  if (bannerUrl) updateData.banner_url = bannerUrl;

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", channelId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    name: data.display_name,
    description: data.description,
    avatarUrl: data.avatar_url,
    bannerUrl: data.banner_url,
    ownerId: data.id,
  };
}
