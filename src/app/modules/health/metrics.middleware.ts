import { NextFunction, Request, Response } from "express";
import metricsService from "./metrics.service";

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  metricsService.incrementRequests();

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      metricsService.incrementErrors();
    }
  });

  next();
};
