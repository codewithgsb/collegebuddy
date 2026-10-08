import type { Item } from "@prisma/client";
import { prisma } from "./db";

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "lost",
  "found",
  "item",
  "near",
  "campus",
]);

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n / Math.max(a.size, b.size);
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function scorePair(lost: Item, found: Item): number {
  let score = 0;

  if (norm(lost.category) && norm(lost.category) === norm(found.category)) {
    score += 28;
  }

  if (norm(lost.color) && norm(lost.color) === norm(found.color)) {
    score += 18;
  }

  const brandA = norm(lost.brand);
  const brandB = norm(found.brand);
  if (brandA && brandB && brandA === brandB) {
    score += 18;
  }

  const locScore = overlap(tokens(lost.location), tokens(found.location));
  score += locScore * 16;

  const hours = Math.abs(lost.eventAt.getTime() - found.eventAt.getTime()) / 36e5;
  if (hours <= 6) score += 16;
  else if (hours <= 24) score += 12;
  else if (hours <= 72) score += 8;
  else if (hours <= 168) score += 4;

  const textA = tokens(`${lost.title} ${lost.description} ${lost.brand}`);
  const textB = tokens(`${found.title} ${found.description} ${found.brand}`);
  score += overlap(textA, textB) * 14;

  return Math.round(score * 10) / 10;
}

const MATCH_THRESHOLD = 38;

export async function autoMatchItem(item: Item) {
  if (item.status !== "OPEN") return [];

  const oppositeType = item.type === "LOST" ? "FOUND" : "LOST";
  const candidates = await prisma.item.findMany({
    where: {
      type: oppositeType,
      status: "OPEN",
      userId: { not: item.userId },
    },
  });

  const created = [];
  for (const other of candidates) {
    const lost = item.type === "LOST" ? item : other;
    const found = item.type === "FOUND" ? item : other;
    const score = scorePair(lost, found);
    if (score < MATCH_THRESHOLD) continue;

    const match = await prisma.match.upsert({
      where: {
        lostItemId_foundItemId: { lostItemId: lost.id, foundItemId: found.id },
      },
      create: { lostItemId: lost.id, foundItemId: found.id, score },
      update: { score },
    });

    const existing = await prisma.notification.findFirst({
      where: { matchId: match.id, userId: lost.userId },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: lost.userId,
          matchId: match.id,
          title: "Possible match for your lost item",
          body: `A found post may match “${lost.title}” near ${found.location}. Accept the match to share contact details.`,
        },
      });
      await prisma.notification.create({
        data: {
          userId: found.userId,
          matchId: match.id,
          title: "Your found post may have an owner",
          body: `A lost post may match “${found.title}”. The owner was alerted. Contact stays hidden until they accept.`,
        },
      });
    }
    created.push(match);
  }
  return created;
}
