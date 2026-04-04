import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import cors from "cors";
import { initWebSocketServer } from "./ws-server";
import { notificationService } from "./services/notification.service";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(cors({
  origin: app.get("env") === "production" ? false : true, // Strict in production, open in dev
  credentials: true
}));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (path.startsWith("/api") && capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }
    log(logLine);
  });

  next();
});

(async () => {
  initWebSocketServer(httpServer);
  await registerRoutes(httpServer, app);
  await notificationService.init();

  // Daily research cache cleanup + fee multiplier retraining (self-learning)
  const startDailyJobs = async () => {
    try {
      const { researchService } = await import("./services/research.service");
      const { storage } = await import("./storage");
      // Clean expired research cache
      const deleted = await storage.deleteExpiredResearchCache();
      if (deleted > 0) console.log(`[Daily] Cleaned ${deleted} expired research cache entries`);
      // Retrain fee multipliers from negotiation outcomes
      await researchService.retrainMultipliers();
      console.log("[Daily] Fee multiplier retraining complete");
    } catch (err) {
      console.error("[Daily] Job failed:", err);
    }
  };
  // Run daily (24h interval), first run after 1 hour to avoid startup load
  setTimeout(() => {
    startDailyJobs();
    setInterval(startDailyJobs, 24 * 60 * 60 * 1000);
  }, 60 * 60 * 1000);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    try {
      log("Setting up Vite dev server...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      log("Vite dev server ready");
    } catch (err) {
      console.error("FATAL: Failed to setup Vite:", err);
      process.exit(1);
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);

      // Contract deadline enforcement: check every 5 minutes
      setInterval(async () => {
        try {
          const { checkContractDeadlines } = await import("./routes/contracts");
          const voided = await checkContractDeadlines();
          if (voided > 0) {
            log(`[ContractTimeout] Voided ${voided} expired contract(s)`);
          }
        } catch (err) {
          // Silent fail - server may not be fully ready yet
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    },
  );
})();
