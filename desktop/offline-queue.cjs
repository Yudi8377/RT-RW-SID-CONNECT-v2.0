const crypto = require("crypto");

const QUEUE_STATUSES = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SYNCED: "SYNCED",
  FAILED: "FAILED"
});

class OfflineQueueEngine {
  constructor(store) {
    if (!store || typeof store.enqueue !== "function" || typeof store.listQueue !== "function") {
      throw new Error("OfflineQueueEngine requires a compatible local database store");
    }
    this.store = store;
  }

  enqueue({ entityType, operation, payload, id, createdAt }) {
    if (!entityType) throw new Error("entityType is required");
    if (!operation) throw new Error("operation is required");
    if (payload === undefined) throw new Error("payload is required");
    return this.store.enqueue({
      id: id || crypto.randomUUID(),
      entityType,
      operation,
      payload,
      createdAt: createdAt || new Date().toISOString()
    });
  }

  pending(limit = 100) {
    return this.store.listQueue({ status: QUEUE_STATUSES.PENDING, limit });
  }

  async replay(handler, { limit = 100 } = {}) {
    if (typeof handler !== "function") throw new Error("replay handler is required");
    const items = this.pending(limit);
    const results = [];

    for (const item of items) {
      this.store.markQueueProcessing(item.id);
      try {
        const result = await handler(item);
        this.store.markQueueSynced(item.id);
        results.push({ id: item.id, status: QUEUE_STATUSES.SYNCED, result });
      } catch (error) {
        this.store.markQueueFailed(item.id, error);
        results.push({
          id: item.id,
          status: QUEUE_STATUSES.FAILED,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      attempted: items.length,
      synced: results.filter((item) => item.status === QUEUE_STATUSES.SYNCED).length,
      failed: results.filter((item) => item.status === QUEUE_STATUSES.FAILED).length,
      results
    };
  }
}

module.exports = { OfflineQueueEngine, QUEUE_STATUSES };
