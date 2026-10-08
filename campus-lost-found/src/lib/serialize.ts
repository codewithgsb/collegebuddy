import type { Item, Match, User } from "@prisma/client";
import { decryptPii } from "./crypto";

export type SafeItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  color: string;
  location: string;
  eventAt: string;
  imageUrl: string | null;
  status: string;
  createdAt: string;
  ownerName: string;
  isMine: boolean;
};

export function toSafeItem(
  item: Item & { user: Pick<User, "displayName"> },
  viewerId: string,
): SafeItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    category: item.category,
    brand: item.brand,
    color: item.color,
    location: item.location,
    eventAt: item.eventAt.toISOString(),
    imageUrl: item.imagePath ? `/${item.imagePath.replace(/^\/+/, "")}` : null,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    ownerName: item.user.displayName,
    isMine: item.userId === viewerId,
  };
}

export function contactForAccepted(
  user: User,
  allowed: boolean,
): { displayName: string; email?: string; phone?: string } {
  if (!allowed) {
    return { displayName: user.displayName };
  }
  let email: string | undefined;
  let phone: string | undefined;
  try {
    email = decryptPii(user.emailEncrypted);
  } catch {
    email = undefined;
  }
  if (user.phoneEncrypted) {
    try {
      phone = decryptPii(user.phoneEncrypted);
    } catch {
      phone = undefined;
    }
  }
  return { displayName: user.displayName, email, phone };
}

export function toSafeMatch(
  match: Match & {
    lostItem: Item & { user: User };
    foundItem: Item & { user: User };
  },
  viewerId: string,
) {
  const accepted = match.status === "ACCEPTED";
  const involved =
    match.lostItem.userId === viewerId || match.foundItem.userId === viewerId;
  const reveal = accepted && involved;
  return {
    id: match.id,
    score: match.score,
    status: match.status,
    createdAt: match.createdAt.toISOString(),
    lostItem: toSafeItem(match.lostItem, viewerId),
    foundItem: toSafeItem(match.foundItem, viewerId),
    lostOwner: contactForAccepted(match.lostItem.user, reveal),
    foundOwner: contactForAccepted(match.foundItem.user, reveal),
  };
}
