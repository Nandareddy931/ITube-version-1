import React from "react";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  channel: {
    name: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    ownerId?: string | null;
  };
  onEdit?: () => void;
};

export default function ChannelHeader({ channel, onEdit }: Props) {
  const { user } = useAuth();
  const isOwner = !!user && !!channel.ownerId && user.id === channel.ownerId;

  return (
    <header style={{ position: "relative", marginBottom: 16 }}>
      <div
        style={{
          height: 180,
          background: channel.bannerUrl ? `url(${channel.bannerUrl}) center/cover no-repeat` : "#e9e9e9",
          display: "flex",
          alignItems: "flex-end",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={channel.avatarUrl || undefined}
            alt="avatar"
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "#ddd",
              objectFit: "cover",
              border: "4px solid white",
            }}
          />
          <div>
            <h1 style={{ margin: 0 }}>{channel.name}</h1>
          </div>
        </div>

        <div style={{ marginLeft: "auto" }}>
          {isOwner && (
            <button
              onClick={onEdit}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "white",
                cursor: "pointer",
              }}
            >
              Edit channel
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
