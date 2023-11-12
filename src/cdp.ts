import { Deferred } from "./deferred.js";

const DEFAULT_URL = "http://localhost:9222";

export interface CdpConnectionOptions {
  url?: string | URL | undefined;
  target?: string | undefined;
}

export interface CdpMessageEventInit<T = unknown> extends EventInit {
  method: string;
  params: T;
}

export class CdpMessageEvent<T = unknown> extends Event {
  readonly method: string;
  readonly params: T;

  constructor(init: CdpMessageEventInit<T>) {
    super("message", init);
    this.method = init.method;
    this.params = init.params;
  }
}

export interface CdpConnectionEventMap {
  message: CdpMessageEvent;
}

export class CdpError extends Error {
  code: number;

  constructor(
    code: number,
    message: string,
    options?: ErrorOptions | undefined
  ) {
    super(message, options);
    this.code = code;
  }
}

export class CdpConnection extends EventTarget {
  static async create(
    options?: CdpConnectionOptions | undefined
  ): Promise<CdpConnection> {
    const cdpConnection = new CdpConnection(options);
    await cdpConnection.#connect();
    return cdpConnection;
  }

  #ws: WebSocket | undefined;
  #url: URL;
  #target: string;
  #requestCount = 0;
  #requests = new Map<number, Deferred<unknown>>();

  private constructor(options: CdpConnectionOptions | undefined) {
    super();

    this.#url = new URL(options?.url ?? DEFAULT_URL);
    this.#target = options?.target ?? "page";
  }

  async #getWsUrl() {
    const response = await fetch(new URL("/json/list", this.#url));
    const targets = await response.json();
    const wsUrl = targets.find(
      (target: any) =>
        target.webSocketDebuggerUrl && target.type === this.#target
    ).webSocketDebuggerUrl;
    return wsUrl;
  }

  #onMessage(payload: any) {
    if ("id" in payload) {
      const deferred = this.#requests.get(payload.id);
      if (!deferred) {
        return;
      }

      if ("error" in payload) {
        deferred.reject(
          new CdpError(payload.error.code, payload.error.message)
        );
      } else {
        deferred.resolve(payload.result);
      }
      return;
    }

    if ("method" in payload) {
      this.dispatchEvent(
        new CdpMessageEvent({
          method: payload.method,
          params: payload.params,
        })
      );
      return;
    }
  }

  async #connect(): Promise<void> {
    const wsUrl = await this.#getWsUrl();
    this.#ws = new WebSocket(wsUrl);

    this.#ws.addEventListener("message", (event) => {
      const text =
        typeof event.data === "string"
          ? event.data
          : new TextDecoder().decode(event.data);

      const payload = JSON.parse(text);
      this.#onMessage(payload);
    });

    return new Promise((resolve, reject) => {
      this.#ws!.addEventListener("open", () => {
        resolve();
      });
      this.#ws!.addEventListener("close", (event) => {
        reject(new Error(event.reason));
      });
      this.#ws!.addEventListener("error", () => {
        reject(new Error());
      });
    });
  }

  send(method: string, params: unknown = {}) {
    const id = this.#requestCount++;

    const payload = {
      id,
      method,
      params,
    };
    this.#ws!.send(JSON.stringify(payload));

    const deferred = new Deferred();
    this.#requests.set(id, deferred);
    return deferred;
  }

  close() {
    this.#ws!.close();
  }

  addEventListener<T extends keyof CdpConnectionEventMap>(
    type: T,
    listener: (this: WebSocket, event: CdpConnectionEventMap[T]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: (this: WebSocket, event: Event) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(...args: Parameters<EventTarget["addEventListener"]>): void {
    return super.addEventListener(...args);
  }

  removeEventListener<T extends keyof CdpConnectionEventMap>(
    type: T,
    listener: (this: WebSocket, event: CdpConnectionEventMap[T]) => unknown,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: (this: WebSocket, event: Event) => unknown,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    ...args: Parameters<EventTarget["removeEventListener"]>
  ): void {
    return super.removeEventListener(...args);
  }
}

export function createCdpConnection(
  options?: CdpConnectionOptions | undefined
) {
  return CdpConnection.create(options);
}
