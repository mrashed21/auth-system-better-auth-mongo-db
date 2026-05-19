import cors from "cors";
import express, { Application } from "express";
import { cors_config } from "./app/config/cors-config";
import { globalErrorHandler } from "./app/middleware/global-error-handler";
import notFound from "./app/middleware/not-found";
import router from "./app/routes/router";
const app: Application = express();

app.use(cors(cors_config));

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Server is running");
});

// IMPORTANT
app.use("/api/v1", router);

// not found
app.use(notFound);
// global error
app.use(globalErrorHandler);

export default app;
