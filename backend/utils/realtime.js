import { EventEmitter } from "events";

const realtimeEmitter = new EventEmitter();
realtimeEmitter.setMaxListeners(100);

export function publishUserManagementEvent(type, payload = {}) {
  realtimeEmitter.emit("admin:users", {
    type,
    payload,
    at: new Date().toISOString(),
  });
}

export function subscribeUserManagement(handler) {
  realtimeEmitter.on("admin:users", handler);
  return () => realtimeEmitter.off("admin:users", handler);
}

