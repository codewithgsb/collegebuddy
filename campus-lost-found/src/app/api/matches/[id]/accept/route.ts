import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toSafeMatch } from "@/lib/serialize";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      lostItem: { include: { user: true } },
      foundItem: { include: { user: true } },
    },
  });
  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  if (match.lostItem.userId !== user.id) {
    return NextResponse.json(
      { error: "Only the owner of the lost item can accept a match." },
      { status: 403 },
    );
  }

  const updated = await prisma.match.update({
    where: { id },
    data: { status: "ACCEPTED" },
    include: {
      lostItem: { include: { user: true } },
      foundItem: { include: { user: true } },
    },
  });

  await prisma.item.updateMany({
    where: { id: { in: [match.lostItemId, match.foundItemId] } },
    data: { status: "MATCHED" },
  });

  await prisma.notification.create({
    data: {
      userId: match.foundItem.userId,
      matchId: match.id,
      title: "Owner accepted your found-item match",
      body: "Contact details are now visible to both of you so you can arrange a return.",
    },
  });

  return NextResponse.json({ match: toSafeMatch(updated, user.id) });
}
