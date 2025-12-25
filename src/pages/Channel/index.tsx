import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ChannelHeader from "@/components/ChannelHeader";
import EditChannelModal from "@/components/EditChannelModal";
import { getChannelById } from "@/services/channelService";
import { useAuth } from "@/contexts/AuthContext";

type ChannelData = {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  ownerId?: string | null;
};

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const isOwnChannel = user && channel && user.id === channel.ownerId;

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getChannelById(id);
        if (mounted) setChannel(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  // Auto-open edit modal when viewing own channel
  useEffect(() => {
    if (isOwnChannel && !loading && !editing) {
      setEditing(true);
    }
  }, [isOwnChannel, loading]);

  if (loading) return <div style={{ padding: 20 }}>Loading channel…</div>;
  if (!channel) return <div style={{ padding: 20 }}>Channel not found</div>;

  return (
    <div>
      <ChannelHeader channel={channel} onEdit={() => setEditing(true)} />
      <main style={{ padding: 20, maxWidth: 920, margin: "0 auto" }}>
        <h2 style={{ marginBottom: 8 }}>About</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{channel.description || "No description yet."}</p>
      </main>

      {editing && isOwnChannel && (
        <EditChannelModal
          channel={channel}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setChannel((prev) => ({ ...(prev as any), ...updated }));
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
