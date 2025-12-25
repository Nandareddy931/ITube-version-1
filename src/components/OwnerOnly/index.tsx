import React from "react";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  ownerId?: string | null;
  children: React.ReactNode;
};

export default function OwnerOnly({ ownerId, children }: Props) {
  const { user } = useAuth();
  const isOwner = !!user && !!ownerId && user.id === ownerId;
  if (!isOwner) return null;
  return <>{children}</>;
}
