import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { autoMatchItem } from "@/lib/match";
import { toSafeItem } from "@/lib/serialize";
import { saveItemImage } from "@/lib/uploads";
import { CATEGORIES, COLORS } from "@/lib/constants";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
  return NextResponse.json({
    items: items.map((item) => toSafeItem(item, user.id)),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const form = await request.formData();
  const type = String(form.get("type") || "").toUpperCase();
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const category = String(form.get("category") || "").trim();
  const brand = String(form.get("brand") || "").trim();
  const color = String(form.get("color") || "").trim();
  const location = String(form.get("location") || "").trim();
  const eventAtRaw = String(form.get("eventAt") || "").trim();
  const image = form.get("image");

  if (type !== "LOST" && type !== "FOUND") {
    return NextResponse.json({ error: "Choose lost or found." }, { status: 400 });
  }
  if (!title || !description || !category || !color || !location || !eventAtRaw) {
    return NextResponse.json(
      { error: "Title, description, category, color, location, and time are required." },
      { status: 400 },
    );
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Pick a valid category." }, { status: 400 });
  }
  if (!COLORS.includes(color as (typeof COLORS)[number])) {
    return NextResponse.json({ error: "Pick a valid color." }, { status: 400 });
  }
  const eventAt = new Date(eventAtRaw);
  if (Number.isNaN(eventAt.getTime())) {
    return NextResponse.json({ error: "Enter a valid last-seen or found time." }, { status: 400 });
  }

  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      imagePath = await saveItemImage(image);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save image.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const item = await prisma.item.create({
    data: {
      userId: user.id,
      type,
      title,
      description,
      category,
      brand: brand || "Unknown",
      color,
      location,
      eventAt,
      imagePath,
    },
    include: { user: true },
  });

  await autoMatchItem(item);

  return NextResponse.json({ item: toSafeItem(item, user.id) }, { status: 201 });
}
