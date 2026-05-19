import { Db } from "mongodb";
import os from "os";
import { performance } from "perf_hooks";
import pidusage from "pidusage";
import process from "process";

export function bytesToMB(bytes: number) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

export function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return `${h}h ${m}m ${s}s`;
}

function getEventLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now();

    setImmediate(() => {
      const lag = performance.now() - start;
      resolve(Number(lag.toFixed(2)));
    });
  });
}

export async function getSystemMetrics(db: Db) {
  /**
   * DB latency
   */
  const dbStart = performance.now();

  await db.command({ ping: 1 });

  const dbLatency = performance.now() - dbStart;

  /**
   * CPU + Memory
   */
  const usage = await pidusage(process.pid);

  const memory = process.memoryUsage();

  const cpuUsage = Number(usage.cpu.toFixed(1));

  /**
   * System Memory
   */
  const totalMemory = bytesToMB(os.totalmem());

  const freeMemory = bytesToMB(os.freemem());

  const usedMemory = totalMemory - freeMemory;

  /**
   * Mongo stats
   */
  let mongoStats = null;

  try {
    const stats = await db.stats();

    mongoStats = {
      collections: stats.collections,
      documents: stats.objects,
      indexes: stats.indexes,

      dataSizeMB: bytesToMB(stats.dataSize),

      storageSizeMB: bytesToMB(stats.storageSize),

      indexSizeMB: bytesToMB(stats.indexSize),
    };
  } catch {
    mongoStats = null;
  }

  /**
   * Event loop lag
   */
  const eventLoopLag = await getEventLoopLag();

  return {
    timestamp: Date.now(),

    uptime: process.uptime(),

    nodeVersion: process.version,

    cpu: {
      usage: cpuUsage,

      load1: Number(os.loadavg()[0].toFixed(2)),
      load5: Number(os.loadavg()[1].toFixed(2)),
      load15: Number(os.loadavg()[2].toFixed(2)),
    },

    memory: {
      rss: bytesToMB(memory.rss),

      heapUsed: bytesToMB(memory.heapUsed),

      heapTotal: bytesToMB(memory.heapTotal),

      external: bytesToMB(memory.external),

      processMemoryMB: bytesToMB(usage.memory),

      usedPercent: Number(((usedMemory / totalMemory) * 100).toFixed(1)),
    },

    system: {
      hostname: os.hostname(),

      platform: os.platform(),

      arch: os.arch(),

      cpuCores: os.cpus().length,

      totalMemory,

      freeMemory,

      usedMemory,
    },

    runtime: {
      pid: process.pid,

      uptime: formatUptime(process.uptime()),

      eventLoopLag,
    },

    database: mongoStats,

    dbLatency: Number(dbLatency.toFixed(2)),
  };
}
