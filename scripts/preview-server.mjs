import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const rootDir = process.cwd();
const appDir = path.join(rootDir, ".next", "server", "app");
const staticDir = path.join(rootDir, ".next", "static");
const publicDir = path.join(rootDir, "public");
const port = 3000;

const routeToHtml = new Map([
  ["/", "black.html"],
  ["/black", "black.html"],
  ["/comfort", "comfort.html"],
  ["/corrida", "corrida.html"],
  ["/Financeiro", "financeiro-login.html"],
  ["/Financeiro/painel", "urbann-dashboard.html"],
  ["/snacks", "snacks.html"],
]);

const desktopPreviewOverride = `<style>
@media (min-width: 641px) {
  .black-car-stage {
    left: 50% !important;
    right: auto !important;
    bottom: 13vh !important;
    inset: auto auto 13vh 50% !important;
    width: min(100.98vw, 1254.6px) !important;
    transform: translateX(-40%) !important;
  }
}
</style>`;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".meta": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": contentTypes[ext] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  if (ext === ".html") {
    let html = "";
    createReadStream(filePath, { encoding: "utf8" })
      .on("data", (chunk) => {
        html += chunk;
      })
      .on("end", () => {
        res.end(html.replace("</head>", `${desktopPreviewOverride}</head>`));
      });
    return;
  }

  createReadStream(filePath).pipe(res);
}

function safeJoin(baseDir, requestedPath) {
  const resolved = path.resolve(baseDir, `.${requestedPath}`);
  return resolved.startsWith(baseDir) ? resolved : null;
}

async function handleRequest(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  if (routeToHtml.has(pathname)) {
    const htmlFile = routeToHtml.get(pathname);
    const htmlPath = path.join(appDir, htmlFile);
    if (existsSync(htmlPath)) {
      return sendFile(res, htmlPath);
    }

    const publicHtmlPath = path.join(publicDir, htmlFile);
    if (existsSync(publicHtmlPath)) {
      return sendFile(res, publicHtmlPath);
    }
  }

  if (pathname === "/financeiro") {
    res.writeHead(302, {
      Location: "/Financeiro",
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  if (pathname === "/financeiro/painel") {
    res.writeHead(302, {
      Location: "/Financeiro/painel",
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  if (pathname.startsWith("/_next/static/")) {
    const staticPath = safeJoin(staticDir, pathname.replace("/_next/static", ""));
    if (staticPath && existsSync(staticPath)) {
      return sendFile(res, staticPath);
    }
  }

  if (pathname === "/_next/image") {
    const imageUrl = url.searchParams.get("url");
    if (imageUrl) {
      const publicPath = safeJoin(publicDir, imageUrl);
      if (publicPath && existsSync(publicPath)) {
        return sendFile(res, publicPath);
      }
    }
  }

  const publicPath = safeJoin(publicDir, pathname);
  if (publicPath && existsSync(publicPath)) {
    return sendFile(res, publicPath);
  }

  const appPath = safeJoin(appDir, pathname);
  if (appPath && existsSync(appPath)) {
    const info = await stat(appPath);
    if (info.isFile()) {
      return sendFile(res, appPath);
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Preview server error: ${error instanceof Error ? error.message : "unknown"}`);
  });
}).listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}`);
});
