export function normalizeDeviceLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);
  return label || null;
}

export async function hashDeviceId(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
