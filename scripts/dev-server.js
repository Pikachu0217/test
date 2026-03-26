/**
 * 一个极简静态文件服务器，用于本地启动 `site/` 目录。
 *
 * 目标：
 * - 零依赖（不需要安装任何 npm 包）
 * - 安全默认：只提供 GET/HEAD，禁止目录穿越
 * - 适合开发：带基础的缓存控制与日志
 *
 * 用法：
 *   npm run start
 *   # 默认 http://127.0.0.1:5173
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 5173);

// 约定：只公开 site/ 目录
const SITE_DIR = path.resolve(__dirname, "..", "site");

/**
 * 根据文件后缀返回 Content-Type。
 * 这里只覆盖本项目会用到的类型，避免引入额外依赖。
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

/**
 * 安全拼接路径：拒绝 `..` 等目录穿越。
 * 返回绝对路径（在 SITE_DIR 内）或 null。
 */
function resolveSafePath(urlPathname) {
  // 解码后再处理，避免 `%2e%2e` 绕过
  const decoded = decodeURIComponent(urlPathname);

  // 目录请求默认返回 index.html
  const normalized = decoded.endsWith("/") ? `${decoded}index.html` : decoded;

  // 移除开头的 `/`
  const withoutLeadingSlash = normalized.replace(/^\/+/, "");

  const absolutePath = path.resolve(SITE_DIR, withoutLeadingSlash);

  // 关键：确保仍然在 SITE_DIR 下
  if (!absolutePath.startsWith(SITE_DIR + path.sep) && absolutePath !== SITE_DIR) {
    return null;
  }

  return absolutePath;
}

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  if (body) res.end(body);
  else res.end();
}

function sendText(res, statusCode, text) {
  send(
    res,
    statusCode,
    { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    text
  );
}

const server = http.createServer((req, res) => {
  const method = req.method || "GET";
  const requestUrl = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  const startedAt = Date.now();
  const log = (statusCode) => {
    const costMs = Date.now() - startedAt;
    // 简单控制台日志，便于开发时观察
    // eslint-disable-next-line no-console
    console.log(`${method} ${requestUrl.pathname} -> ${statusCode} (${costMs}ms)`);
  };

  // 只允许 GET/HEAD（静态资源足够）
  if (method !== "GET" && method !== "HEAD") {
    sendText(res, 405, "Method Not Allowed");
    log(405);
    return;
  }

  const filePath = resolveSafePath(requestUrl.pathname);
  if (!filePath) {
    sendText(res, 400, "Bad Request");
    log(400);
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      sendText(res, 404, "Not Found");
      log(404);
      return;
    }

    const contentType = getContentType(filePath);
    const headers = {
      "Content-Type": contentType,
      // 开发时避免缓存导致“刷新看不到变化”
      "Cache-Control": "no-store"
    };

    if (method === "HEAD") {
      send(res, 200, headers);
      log(200);
      return;
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        sendText(res, 500, "Internal Server Error");
        log(500);
        return;
      }
      send(res, 200, headers, data);
      log(200);
    });
  });
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Local server: http://${HOST}:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Serving directory: ${SITE_DIR}`);
});

