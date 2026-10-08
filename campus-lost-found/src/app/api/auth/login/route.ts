import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashEmail, randomToken, verifyPassword } from "@/lib/crypto";
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

  if (!email || !password) {
    return NextResponse.json({ error: "College email and password are required." }, { status: 400 });
  }
  if (!isCollegeEmail(email)) {
    return NextResponse.json({ error: collegeEmailError() }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { emailHash: hashEmail(email) } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Those college credentials do not match our records." }, { status: 401 });
  }

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
