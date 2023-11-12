export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

export type DeferredState = "pending" | "fulfilled" | "rejected";

export class Deferred<T> extends Promise<T> {
  readonly state: DeferredState = "pending";
  readonly value?: T;
  readonly reason?: unknown;

  resolve!: (value: T | PromiseLike<T>) => void;
  reject!: (reason?: unknown) => void;

  constructor(
    executor?: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: unknown) => void
    ) => void
  ) {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    super((_resolve, _reject) => {
      resolve = (value) => {
        if (this.state === "pending" && !isPromiseLike(value)) {
          (this as Deferred<T> & { state: DeferredState }).state = "fulfilled";
          (this as Deferred<T> & { value?: T }).value = value;
        }
        return _resolve(value);
      };
      reject = (reason) => {
        if (this.state === "pending") {
          (this as Deferred<T> & { state: DeferredState }).state = "rejected";
          (this as Deferred<T> & { reason?: unknown }).reason = reason;
        }
        return _reject(reason);
      };
      executor?.(resolve, reject);
    });
    this.resolve = resolve;
    this.reject = reject;
  }
}
