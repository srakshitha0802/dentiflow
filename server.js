const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });

console.log(`[DentiFlow Server] Starting Next.js app on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}...`);

app.prepare().then(() => {
  const handle = app.getRequestHandler();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("[DentiFlow Server] Error handling request:", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(port, hostname, () => {
    console.log(`==================================================`);
    console.log(`🚀 DentiFlow Dental Platform is Live & Production-Ready!`);
    console.log(`📡 URL: http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
    console.log(`==================================================`);
  });
}).catch((err) => {
  console.error("[DentiFlow Server] Preparation error:", err);
  process.exit(1);
});
