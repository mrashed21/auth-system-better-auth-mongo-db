import cors from "cors";
import { env_config } from "./env-config";

export const cors_config: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (env_config.FRONTEND_URLS.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error("CORS policy does not allow access from this origin."),
    );
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  maxAge: 86400, // 24h preflight cache
};
