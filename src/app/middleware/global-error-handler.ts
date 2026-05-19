import { NextFunction, Request, Response } from "express";
import { handleMongooseError } from "./error-handler";

export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const formattedError = handleMongooseError(error);

  res.status(formattedError.status_code).json({
    success: formattedError.success,
    message: formattedError.message,
    errorSource: formattedError.errorSource,
  });
};
