if (typeof process !== "undefined" && typeof WebSocket === "undefined") {
  await import("websocket-polyfill");
}

export * from './cdp.js';
