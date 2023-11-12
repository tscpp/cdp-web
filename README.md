# cdp-web

This library provides a lightweight way to communicate with the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) (CDP). Supports browsers, Deno, Node, and Bun. Less than 2KB minified.

```javascript
import { createCdpConnection } from "cdp-web";

const cdp = await createCdpConnection({
  url: "http://localhost:9222", // optional, default value
  target: "page", // optional, default value
});

// Send 'Tracing.getCategories' command and wait for the result.
const categories = await cdp.send("Tracing.getCategories");

// Listen for all CDP events.
cdp.addEventListener("message", (event) => {
  if (event.method === "Tracing.dataCollected") {
    // Handle 'Tracing.dataCollected' event.
    console.log(event.params);
  }
});
```
