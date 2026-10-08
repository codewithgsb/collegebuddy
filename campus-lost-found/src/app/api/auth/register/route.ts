import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptPii, hashEmail, hashPassword, randomToken } from "@/lib/crypto";
import {
  collegeEmailError,
  isCollegeEmail,
  normalizeEmail,
} from "@/lib/college-email";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!email || !password || !displayName) {
    return NextResponse.json({ error: "Name, college email, and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Use a password of at least 8 characters." }, { status: 400 });
  }
  if (!isCollegeEmail(email)) {
    return NextResponse.json({ error: collegeEmailError() }, { status: 403 });
  }

  const emailHash = hashEmail(email);
  const existing = await prisma.user.findUnique({ where: { emailHash } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      emailHash,
      emailEncrypted: encryptPii(email),
      passwordHash: await hashPassword(password),
      displayName,
      phoneEncrypted: phone ? encryptPii(phone) : null,
    },
  });

  const token = randomToken();
  const expiresAt = await createSession(user.id, token);
  const res = NextResponse.json({
    user: { id: user.id, displayName: user.displayName },
  });
  res.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  );
  return res;
}
