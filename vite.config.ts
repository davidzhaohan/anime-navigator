import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

const ANIME_DIR = path.resolve(__dirname, "available_animes");

const CATALOG_FILE = path.join(ANIME_DIR, "catalog.json");
const META_FILE = path.join(ANIME_DIR, "catalog-meta.json");
const FINISHED_FILE = path.join(ANIME_DIR, "finished-ids.json");

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function apiPlugin() {
  return {
    name: "anime-api",
    configureServer(server: import("vite").ViteDevServer) {
      if (!fs.existsSync(ANIME_DIR)) {
        fs.mkdirSync(ANIME_DIR, { recursive: true });
      }

      server.middlewares.use("/api/catalog", (req, res) => {
        if (req.method === "GET") {
          const data = readJson(CATALOG_FILE) ?? [];
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } else if (req.method === "PUT") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            writeJson(CATALOG_FILE, JSON.parse(body));
            res.end(JSON.stringify({ ok: true }));
          });
        } else {
          res.statusCode = 405;
          res.end("Method Not Allowed");
        }
      });

      server.middlewares.use("/api/catalog-meta", (req, res) => {
        if (req.method === "GET") {
          const data = readJson(META_FILE);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } else if (req.method === "PUT") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            writeJson(META_FILE, JSON.parse(body));
            res.end(JSON.stringify({ ok: true }));
          });
        } else {
          res.statusCode = 405;
          res.end("Method Not Allowed");
        }
      });

      server.middlewares.use("/api/finished-ids", (req, res) => {
        if (req.method === "GET") {
          const data = readJson(FINISHED_FILE) ?? [];
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } else if (req.method === "PUT") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            writeJson(FINISHED_FILE, JSON.parse(body));
            res.end(JSON.stringify({ ok: true }));
          });
        } else {
          res.statusCode = 405;
          res.end("Method Not Allowed");
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), apiPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
