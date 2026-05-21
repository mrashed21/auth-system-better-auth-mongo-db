import status from "http-status";
import { z } from "zod";
import { TErrorResponse, TErrorSource } from "../interface/error.interface";

export const handle_zod_error = (err: z.ZodError): TErrorResponse => {
  const status_code = status.BAD_REQUEST;
  const message = err.message;
  const error_source: TErrorSource[] = [];

  err.issues.forEach((issue: z.ZodIssue) => {
    error_source.push({
      path: issue.path.join(" -> "),
      message: issue.message,
    });
  });
  const errorResponse: TErrorResponse = {
    success: false,
    message,
    error_source,
    error: err,
    status_code,
  };
  return errorResponse;
};
