import { Request, Response } from "express";
import status from "http-status";

const not_found = (req: Request, res: Response) => {
  res.status(status.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} Not Found`,
    path: req.originalUrl,
    date: Date(),
  });
};

export default not_found;
