import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toSafeItem, toSafeMatch } from "@/lib/serialize";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ lostItemId: id }, { foundItemId: id }],
    },
    include: {
      lostItem: { include: { user: true } },
      foundItem: { include: { user: true } },
    },
    orderBy: { score: "desc" },
  });

  const visible = matches.filter(
    (m) => m.lostItem.userId === user.id || m.foundItem.userId === user.id || m.status === "ACCEPTED",
  );

  return NextResponse.json({
    item: toSafeItem(item, user.id),
    matches: visible.map((m) => toSafeMatch(m, user.id)),
  });
}
