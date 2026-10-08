import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./constants";

export async function saveItemImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 6MB or smaller.");
  }
  const type = file.type || "application/octet-stream";
  if (!ALLOWED_IMAGE_TYPES.has(type) && !type.startsWith("image/")) {
    throw new Error("Please upload a photo (JPEG, PNG, WEBP, or HEIC).");
  }

  const extFromName = path.extname(file.name).toLowerCase();
  const ext =
    extFromName && extFromName.length <= 5
      ? extFromName
      : type === "image/png"
        ? ".png"
        : type === "image/webp"
          ? ".webp"
          : type === "image/gif"
            ? ".gif"
            : ".jpg";

  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buffer);
  return `uploads/${filename}`;
}
