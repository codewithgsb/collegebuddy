import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { decryptPii } from "@/lib/crypto";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });
  let email: string | null = null;
  try {
    email = decryptPii(user.emailEncrypted);
  } catch {
    email = null;
  }
  return NextResponse.json({
    user: {
      id: user.id,
      displayName: user.displayName,
      email,
      unreadAlerts: unread,
    },
  });
}
