import app from "./app";
import { env_config } from "./app/config/env-config";
import { connectDB, connectMongoose } from "./app/lib/mongodb";

const banner = (port: number | string) => {
  const url = `http://localhost:${port}`;
  const mode = env_config.NODE_ENV;
  const started = new Date().toLocaleTimeString();

  const INNER = 52;

  const row = (label: string, value: string) => {
    const content = `${label}${value}`;
    const pad = " ".repeat(Math.max(0, INNER - content.length));
    return `║  ${content}${pad}║`;
  };

  const lines = [
    ``,
    `╔══════════════════════════════════════════════════════╗`,
    `║          AUTH SYSTEM BACKEND SERVER                  ║`,
    `╠══════════════════════════════════════════════════════╣`,
    row(" Status   : ", "Online"),
    row(" URL      : ", url),
    row(" Mode     : ", mode),
    row(" Started  : ", started),
    `╚══════════════════════════════════════════════════════╝`,
    ``,
  ];

  console.log(lines.join("\n"));
};

const divider = (char = "─", length = 55) =>
  console.log("  " + char.repeat(length));

export const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅  ${msg}`),
  warn: (msg: string) => console.log(`⚠️  ${msg}`),
  error: (msg: string) => console.error(`❌  ${msg}`),
  event: (msg: string) => console.log(`⚡  ${msg}`),
};

const server = async () => {
  const PORT = env_config.PORT;

  try {
    log.info("Initializing server...");

    await connectDB();
    await connectMongoose();

    log.success("Database connected successfully.");

    app.listen(PORT, () => {
      banner(PORT);
      divider();
      log.success("Server started successfully");
      log.event(`Listening on port ${PORT}`);
      log.info(`Environment : ${env_config.NODE_ENV}`);
      log.info(`Base URL    : http://localhost:${PORT}/api/v1`);
      log.info(`Server Health: http://localhost:${PORT}/api/v1/health`);
      divider();
      console.log("");
    });
  } catch (error) {
    divider("═");
    log.error("Failed to start server!");
    log.error(`Reason: ${(error as Error).message}`);
    divider("═");
    await connectDB();
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log("");
  divider();
  log.warn(`Shutting down server (${signal})...`);
  await connectDB();
  log.info("Database disconnected");
  log.info("Goodbye! 👋");
  divider();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", async (err) => {
  log.error(`Uncaught Exception: ${err.message}`);
  await connectDB();
  process.exit(1);
});

server();
