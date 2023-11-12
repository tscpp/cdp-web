import assert from "node:assert/strict";
import { CdpConnection, createCdpConnection } from "../src/index";
import { test, beforeAll, afterAll } from "bun:test";

let cdp: CdpConnection;

beforeAll(async () => {
  try {
    await fetch("http://localhost:9222/json/version");
  } catch {
    console.log(
      "\nSome tests require an instance of Chrome already running with debugger exposed at port 9222."
    );
    console.log("> chrome --remote-debugging-port=9222\n");
    process.exit(1);
  }

  cdp = await createCdpConnection();
});

afterAll(() => {
  cdp.close();
});

test("send returns result", async () => {
  const result = await cdp.send("Browser.getVersion");
  assert(result);
});

test("dispatches cdp events", async (done) => {
  await cdp.send("Network.enable");

  cdp.addEventListener("message", (event) => {
    assert(event.method);
    done();
  });

  await cdp.send("Page.navigate", {
    url: "https://example.com",
  });
});
