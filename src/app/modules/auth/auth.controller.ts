import api_error from "@/app/helper/api-error";
import catch_async from "@/app/helper/catch-async";
import send_response from "@/app/helper/send-response";
import { get_request_info } from "@/app/middleware/request.info";
import { cookie_utils } from "@/app/utils/cookie";
import { token_utils } from "@/app/utils/token";
import { Request, Response } from "express";
import status from "http-status";
import { auth_service } from "./auth.service";

export const auth_controller = {
  //! register
  register: catch_async(async (req: Request, res: Response) => {
    const result = await auth_service.register(req.body);
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: result.message,
      data: result.data,
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
    // ! set access token cookie
    if (result.data.access_token) {
      token_utils.set_cookie.access(res, result.data.access_token);
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

  //! refresh token
  refresh_token: catch_async(async (req: Request, res: Response) => {
    const refresh_token =
      req.cookies?.refresh_token || req.body?.refresh_token || "";
    const result = await auth_service.refresh_token(refresh_token);

    token_utils.set_cookie.refresh(res, result.data.refresh_token);
    token_utils.set_cookie.access(res, result.data.access_token);

    send_response(res, {
      status_code: result.statusCode,
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
    // ! set access token cookie
    token_utils.set_cookie.access(res, result.data.access_token);
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

  // ! get logged user
  get_me: catch_async(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user?._id) {
      throw new api_error(status.UNAUTHORIZED, "Unauthorized access!");
    }
    const result = await auth_service.get_me(user._id);
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "User retrieved successfully",
      data: result.data.user,
    });
  }),

  // ! logout user
  logout: catch_async(async (req: Request, res: Response) => {
    token_utils.clear_cookie.access(res);
    token_utils.clear_cookie.refresh(res);
    cookie_utils.clear(res, "better-auth.session_token");

    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "User logged out successfully",
      // data: result,
    });
  }),

  //! enable_2fa
  enable_2fa: catch_async(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user?._id) {
      throw new api_error(status.UNAUTHORIZED, "Unauthorized access!");
    }

    const request_data = get_request_info(req);
    const result = await auth_service.enable_2fa(
      user._id,
      req.body.two_factor_otp_method,
      {
        ...request_data,
        request_device: request_data.request_device
          ? JSON.stringify(request_data.request_device)
          : undefined,
      },
    );
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: result.message,
      data: result.data,
    });
  }),

  // ! toggle 2fa
  toggle_2fa: catch_async(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?._id) {
      throw new api_error(status.UNAUTHORIZED, "Unauthorized access!");
    }
    const result = await auth_service.toggle_2fa(user._id, req.body);
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "2FA toggled successfully",
      data: result,
    });
  }),

  //! change_password_request
  change_password_request: catch_async(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?._id) {
      throw new api_error(status.UNAUTHORIZED, "Unauthorized access!");
    }

    const request_data = get_request_info(req);
    const result = await auth_service.change_password_request(
      user._id,
      req.body.old_password,
      {
        ...request_data,
        request_device: request_data.request_device
          ? JSON.stringify(request_data.request_device)
          : undefined,
      },
    );
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "Password change request successful",
      data: result,
    });
  }),

  // ! confirm password change

  confirm_password_change: catch_async(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?._id) {
      throw new api_error(status.UNAUTHORIZED, "Unauthorized access!");
    }
    const result = await auth_service.change_password_confirm(
      user._id,
      req.body.new_password,
      req.body.verify_otp,
    );
    send_response(res, {
      status_code: status.OK,
      success: true,
      message: "Password changed successfully",
      data: result,
    });
  }),

  //! forgot password
  forgot_password: catch_async(async (req: Request, res: Response) => {
    const request_data = get_request_info(req);
    const result = await auth_service.forgot_password(
      req.body.user_email,
      req.body.user_phone,
      {
        ...request_data,
        request_device: request_data.request_device
          ? JSON.stringify(request_data.request_device)
          : undefined,
      },
    );

    send_response(res, {
      status_code: status.OK,
      success: true,
      message: result.message,
      data: result,
    });
  }),

  //! reset password
  reset_password: catch_async(async (req: Request, res: Response) => {
    const result = await auth_service.reset_password(
      req.body.new_password,
      req.body.verify_otp,
      req.body.user_email,
      req.body.user_phone,
    );

    send_response(res, {
      status_code: status.OK,
      success: true,
      message: result.message,
      data: result,
    });
  }),

  //! change contact request
  change_contact_request: catch_async(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?._id) {
      throw new api_error(status.UNAUTHORIZED, "Unauthorized access!");
    }

    const request_data = get_request_info(req);
    const result = await auth_service.change_contact_request(
      user._id,
      req.body.new_email,
      req.body.new_phone,
      {
        ...request_data,
        request_device: request_data.request_device
          ? JSON.stringify(request_data.request_device)
          : undefined,
      },
    );

    send_response(res, {
      status_code: status.OK,
      success: true,
      message: result.message,
      data: result,
    });
  }),

  //! change contact confirm
  change_contact_confirm: catch_async(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?._id) {
      throw new api_error(status.UNAUTHORIZED, "Unauthorized access!");
    }

    const result = await auth_service.change_contact_confirm(
      user._id,
      req.body.verify_otp,
    );

    send_response(res, {
      status_code: status.OK,
      success: true,
      message: result.message,
      data: result,
    });
  }),
};
