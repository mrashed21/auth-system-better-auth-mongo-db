import catch_async from "@/app/helper/catch-async";
import send_response from "@/app/helper/send-response";
import { token_utils } from "@/app/utils/token";
import { Request, Response } from "express";
import status from "http-status";
import { auth_service } from "./auth.service";

export const auth_controller = {
  //! register
  register: catch_async(async (req: Request, res: Response) => {
    console.log("Register controller called with data:", req.body);
    const result = await auth_service.register(req.body);
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  }),

  // ! verify otp
  verify_otp: catch_async(async (req: Request, res: Response) => {
    const result = await auth_service.verify_otp(req.body);
    // ! set refresh token cookie

    token_utils.set_cookie.refresh(res, result.data.refresh_token);

    // ! send response

    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "OTP verified successfully",
      data: {
        access_token: result.data.access_token,

        user: result.data.user,
      },
    });
  }),

  //! resend otp
  resend_otp: catch_async(async (req: Request, res: Response) => {
    const result = await auth_service.resend_otp(req.body);
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "OTP resent successfully",
      data: result,
    });
  }),

  // ! login
  login: catch_async(async (req: Request, res: Response) => {
    const result = await auth_service.login(req.body);

    // ! set refresh token cookie
    if (result.data.refresh_token) {
      token_utils.set_cookie.refresh(res, result.data.refresh_token);
    }

    // ! response
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: {
        access_token: result.data.access_token,
        user: result.data.user,
      },
    });
  }),

  //! verify_login_2fa with otp
  verify_login_2fa: catch_async(async (req: Request, res: Response) => {
    const result = await auth_service.verify_login_2fa(req.body);

    // ! set refresh token cookie
    token_utils.set_cookie.refresh(res, result.data.refresh_token);

    // ! response
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: {
        access_token: result.data.access_token,
        user: result.data.user,
      },
    });
  }),
};
