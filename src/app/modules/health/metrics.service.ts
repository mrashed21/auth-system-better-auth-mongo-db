import { db } from "@/app/lib/mongodb";
import { getSystemMetrics } from "./system-metrics";

class MetricsService {
  private metrics: any[] = [];

  private latestMetric: any = null;

  private requests = 0;

  private errors = 0;

  private sseClients = 0;

  incrementRequests() {
    this.requests++;
  }

  incrementErrors() {
    this.errors++;
  }

  addSSEClient() {
    this.sseClients++;
  }

  removeSSEClient() {
    this.sseClients--;
  }

  async collect() {
    const metric = await getSystemMetrics(db);

    const fullMetric = {
      ...metric,

      requests: this.requests,

      errors: this.errors,

      sseClients: this.sseClients,
    };

    this.latestMetric = fullMetric;

    this.metrics.push(fullMetric);

    if (this.metrics.length > 3600) {
      this.metrics.shift();
    }

    return fullMetric;
  }

  getLatestMetric() {
    return this.latestMetric;
  }
}

const metricsService = new MetricsService();

/**
 * INITIAL COLLECT
 */
(async () => {
  try {
    await metricsService.collect();
  } catch (err) {
    console.error(err);
  }
})();

/**
 * INTERVAL
 */
setInterval(async () => {
  try {
    await metricsService.collect();
  } catch (error) {
    console.error("Metrics Error:", error);

    metricsService.incrementErrors();
  }
}, 1000);

export default metricsService;
