import React, { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import { updateChannel } from "@/services/channelService";

type Channel = {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
};

type Props = {
  channel: Channel;
  onClose: () => void;
  onSaved: (updated: Partial<Channel>) => void;
};

export default function EditChannelModal({ channel, onClose, onSaved }: Props) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("description", description);
      if (avatarFile) form.append("avatar", avatarFile);
      if (bannerFile) form.append("banner", bannerFile);

      const updated = await updateChannel(channel.id, form);
      onSaved(updated);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        zIndex: 60,
      }}
    >
      <form onSubmit={handleSubmit} style={{ width: 780, maxWidth: "95%", background: "white", borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Edit channel</h3>
          <div>
            <button type="button" onClick={onClose} style={{ marginRight: 8 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding: "8px 12px" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>Channel name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", padding: 8 }} />
            <label style={{ display: "block", fontSize: 13, marginTop: 12 }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} style={{ width: "100%", padding: 8 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>Profile picture</label>
              <ImageUploader initialPreview={channel.avatarUrl ?? undefined} onFileSelected={(f) => setAvatarFile(f)} accept="image/*" square />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>Banner image</label>
              <ImageUploader initialPreview={channel.bannerUrl ?? undefined} onFileSelected={(f) => setBannerFile(f)} accept="image/*" tall />
            </div>
          </div>
        </div>

        {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
      </form>
    </div>
  );
}
