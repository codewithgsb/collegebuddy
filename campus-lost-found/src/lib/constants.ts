export const CATEGORIES = [
  "Electronics",
  "ID / Cards",
  "Keys",
  "Clothing",
  "Bag / Backpack",
  "Water bottle",
  "Jewelry",
  "Books / Notes",
  "Other",
] as const;

export const COLORS = [
  "Black",
  "White",
  "Gray",
  "Silver",
  "Gold",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Orange",
  "Pink",
  "Purple",
  "Brown",
  "Multicolor",
  "Other",
] as const;

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
