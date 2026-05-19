export interface TErrorSource {
  path: string;
  message: string;
}

export interface TErrorResponse {
  success: boolean;
  message: string;
  errorSource: TErrorSource[];
  error?: any;
  status_code?: number;
  stack?: string;
}
