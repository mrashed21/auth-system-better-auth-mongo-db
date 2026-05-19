import { Response } from "express";

interface IResponse<T> {
  status_code?: number;
  success: boolean;
  message: string;
  data?: T;
}

const send_response = <T>(res: Response, responseData: IResponse<T>) => {
  const { status_code = 200, success, message, data } = responseData;
  res.status(status_code).json({
    success,
    message,
    data,
  } as IResponse<T>);
};

export default send_response;
