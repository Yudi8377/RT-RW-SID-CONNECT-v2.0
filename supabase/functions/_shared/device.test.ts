import { hashDeviceId, normalizeDeviceLabel } from "./device.ts";

Deno.test("device IDs are hashed deterministically without returning the raw identifier", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const first = await hashDeviceId(id);
  const second = await hashDeviceId(id.toUpperCase());
  if (first !== second) throw new Error("device hash is not deterministic");
  if (!/^[a-f0-9]{64}$/.test(first)) throw new Error("device hash is not a SHA-256 hex digest");
  if (first.includes(id)) throw new Error("raw device identifier leaked into hash");
});

Deno.test("device labels are bounded and control characters are removed", () => {
  if (normalizeDeviceLabel("  Browser\n\tweb  ") !== "Browserweb") {
    throw new Error("device label normalization failed");
  }
  if (normalizeDeviceLabel("x".repeat(200))?.length !== 80) {
    throw new Error("device label length was not bounded");
  }
  if (normalizeDeviceLabel(" \u0000 ") !== null) {
    throw new Error("empty sanitized label should become null");
  }
});
