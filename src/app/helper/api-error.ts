class api_error extends Error {
  public status_code: number;
  public stack?: string;
  constructor(status_code: number, message: string, stack?: string) {
    super(message);
    this.status_code = status_code;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default api_error;
