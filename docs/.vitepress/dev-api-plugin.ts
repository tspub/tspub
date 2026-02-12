/**
 * Vite plugin that runs Vercel serverless functions locally during dev.
 * Intercepts /api/* requests and dynamically imports + executes the handlers.
 */
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");

export function devApiPlugin(): Plugin {
  return {
    name: "tspub-dev-api",
    configureServer(server) {
      // Only these routes are serverless functions; everything else (e.g. /api/ docs page) passes through
      const handlerMap: Record<string, string> = {
        check: resolve(projectRoot, "api/check.ts"),
        scan: resolve(projectRoot, "api/scan.ts"),
        badge: resolve(projectRoot, "api/badge.ts"),
      };
      const knownRoutes = new Set([...Object.keys(handlerMap), "og"]);

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith("/api/")) {
          return next();
        }

        // Parse URL
        const fullUrl = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
        const route = fullUrl.pathname.replace(/^\/api\//, "").replace(/\/$/, "");

        // If not a known serverless route, let VitePress handle it (e.g. /api/ docs page)
        if (!knownRoutes.has(route)) {
          return next();
        }

        // OG endpoint uses edge runtime — skip in dev
        if (route === "og") {
          res.statusCode = 501;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "OG endpoint only works on Vercel (edge runtime)" }));
          return;
        }

        const handlerPath = handlerMap[route];
        if (!handlerPath) {
          return next();
        }

        try {
          // Dynamically import the handler
          const mod = await server.ssrLoadModule(handlerPath);
          const handler = mod.default;

          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Handler is not a function" }));
            return;
          }

          // Build mock VercelRequest
          const query: Record<string, string> = {};
          for (const [k, v] of fullUrl.searchParams) {
            query[k] = v;
          }

          const mockReq = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            query,
          };

          // Build mock VercelResponse
          let statusCode = 200;
          const responseHeaders: Record<string, string> = {};

          const mockRes = {
            status(code: number) {
              statusCode = code;
              return mockRes;
            },
            setHeader(key: string, value: string) {
              responseHeaders[key] = value;
              return mockRes;
            },
            json(body: unknown) {
              res.statusCode = statusCode;
              res.setHeader("Content-Type", "application/json");
              for (const [k, v] of Object.entries(responseHeaders)) {
                res.setHeader(k, v);
              }
              res.end(JSON.stringify(body));
              return mockRes;
            },
          };

          await handler(mockReq, mockRes);
        } catch (err) {
          console.error(`[dev-api] Error in /api/${route}:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        }
      });
    },
  };
}
