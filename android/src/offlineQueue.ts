import * as SecureStore from "expo-secure-store";

export type MobileRequest = {
  id: string;
  serviceName: string;
  citizenName: string;
  scopeLabel: string;
  createdAt: string;
};

const KEY = "rt_rw_sid_mobile_request_queue_v1";

async function readQueue(): Promise<MobileRequest[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function writeQueue(items: MobileRequest[]) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(items));
}

export async function enqueueRequest(item: Omit<MobileRequest, "id" | "createdAt">) {
  const queue = await readQueue();
  queue.push({ ...item, id: `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() });
  await writeQueue(queue);
  return queue.length;
}

export async function queuedCount() {
  return (await readQueue()).length;
}

export async function flushQueue(
  submit: (item: MobileRequest) => Promise<boolean>,
) {
  const queue = await readQueue();
  if (!queue.length) return 0;
  const remaining: MobileRequest[] = [];
  let flushed = 0;
  for (const item of queue) {
    try {
      if (await submit(item)) flushed += 1;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  await writeQueue(remaining);
  return flushed;
}
