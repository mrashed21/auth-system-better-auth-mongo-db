import status from "http-status";

import { Error } from "mongoose";

type TErrorSource = {
  path: string;
  message: string;
};

type TErrorResponse = {
  success: boolean;
  status_code: number;
  message: string;
  errorSource: TErrorSource[];
};

const duplicateKeyError = (error: any): TErrorResponse => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];

  return {
    success: false,
    status_code: status.CONFLICT,
    message: "Duplicate field value entered",
    errorSource: [
      {
        path: field,
        message: `${field} "${value}" already exists`,
      },
    ],
  };
};

const validationError = (error: Error.ValidationError): TErrorResponse => {
  const errorSource: TErrorSource[] = [];

  Object.values(error.errors).forEach((err: any) => {
    errorSource.push({
      path: err.path,
      message: err.message,
    });
  });

  return {
    success: false,
    status_code: status.BAD_REQUEST,
    message: "Validation Error",
    errorSource,
  };
};

const castError = (error: Error.CastError): TErrorResponse => {
  return {
    success: false,
    status_code: status.BAD_REQUEST,
    message: "Invalid MongoDB ObjectId",
    errorSource: [
      {
        path: error.path,
        message: `Invalid value: ${error.value}`,
      },
    ],
  };
};

const mongooseServerSelectionError = (error: any): TErrorResponse => {
  return {
    success: false,
    status_code: status.SERVICE_UNAVAILABLE,
    message: "MongoDB connection failed",
    errorSource: [
      {
        path: "MongoDB",
        message: error.message,
      },
    ],
  };
};

const mongooseStrictModeError = (error: any): TErrorResponse => {
  return {
    success: false,
    status_code: status.BAD_REQUEST,
    message: "Unknown field provided",
    errorSource: [
      {
        path: error.path || "unknown",
        message: error.message,
      },
    ],
  };
};

export const handleMongooseError = (error: any): TErrorResponse => {
  // Duplicate Key Error
  if (error.code === 11000) {
    return duplicateKeyError(error);
  }

  // Validation Error
  if (error instanceof Error.ValidationError) {
    return validationError(error);
  }

  // Invalid ObjectId
  if (error instanceof Error.CastError) {
    return castError(error);
  }

  // MongoDB Connection Error
  if (error.name === "MongooseServerSelectionError") {
    return mongooseServerSelectionError(error);
  }

  // Strict Mode Error
  if (error.name === "StrictModeError") {
    return mongooseStrictModeError(error);
  }

  // Fallback
  return {
    success: false,
    status_code: error.statusCode || status.INTERNAL_SERVER_ERROR,
    message: error.message || "Something went wrong",
    errorSource: [
      {
        path: "Internal",
        message: error.message || "Unexpected server error",
      },
    ],
  };
};
