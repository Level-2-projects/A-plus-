/**
 * dev/node-test-shim.js – Minimal browser shims for running the mock test scenarios in Node.
 *
 * The browser runner remains the primary validation tool, but this shim lets the same
 * scenario suite execute from a terminal for quick verification when no browser is available.
 *
 * Exports: none. Adds the globals the mock modules expect while running under Node.
 */

function createStorage() {
  const store = new Map();
  return {
    /** Reads a stored string value or null when absent. */
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    /** Writes a stringified value without synthesizing same-tab storage events. */
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    /** Removes one value from this storage area. */
    removeItem(key) {
      store.delete(key);
    },
    /** Removes every value from this storage area. */
    clear() {
      store.clear();
    },
    /** Returns the key at an index, matching the Web Storage interface. */
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    /** Reports the number of stored entries. */
    get length() {
      return store.size;
    },
  };
}

class NodeEventTarget {
  /** Initializes event listeners and the browser properties used by the mock modules. */
  constructor() {
    this.listeners = new Map();
    this.location = {
      href: "",
      assign: (url) => {
        this.location.href = url;
      },
    };
    this.performance = {
      now: () => Date.now(),
    };
  }

  /** Registers a callback for an event type. */
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  /** Removes a previously registered callback. */
  removeEventListener(type, callback) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(
      type,
      listeners.filter((listener) => listener !== callback)
    );
  }

  /** Dispatches an event to a snapshot of listeners for its type. */
  dispatchEvent(event) {
    const callbacks = this.listeners.get(event.type) || [];
    for (const callback of [...callbacks]) {
      callback.call(this, event);
    }
    return true;
  }
}

const windowObject = new NodeEventTarget();
/** Simulates a storage notification arriving from another browser tab. */
windowObject.dispatchExternalStorageEvent = (key) => {
  windowObject.dispatchEvent({ type: "storage", key });
};
windowObject.CustomEvent = class CustomEvent extends Event {
  constructor(type, options = {}) {
    super(type);
    Object.assign(this, options);
  }
};

if (typeof globalThis.window === "undefined") {
  globalThis.window = windowObject;
}
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = createStorage();
}
if (typeof globalThis.sessionStorage === "undefined") {
  globalThis.sessionStorage = createStorage();
}
if (typeof globalThis.CustomEvent === "undefined") {
  globalThis.CustomEvent = windowObject.CustomEvent;
}
if (typeof globalThis.Event === "undefined") {
  globalThis.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
}
if (typeof globalThis.performance === "undefined") {
  globalThis.performance = windowObject.performance;
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
  };
}
