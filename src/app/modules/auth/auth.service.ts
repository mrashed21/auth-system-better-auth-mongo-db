import api_error from "@/app/helper/api-error";
import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { IJwtPayload } from "../../utils/jwt";
import { token_utils } from "../../utils/token";
import { otp_service } from "../otp/opt.service";
import { otp_types } from "../otp/otp.interface";
import { IUserModel } from "./auth.interface";
import { user } from "./auth.model";
import { auth } from "@/app/lib/auth";

const build_auth_payload = (user_exists: IUserModel): IJwtPayload => ({
  _id: user_exists._id.toString(),
  user_role: user_exists.user_role,
  user_email: user_exists.user_email,
  user_phone: user_exists.user_phone,
  user_email_verified: user_exists.email_verified,
  user_phone_verified: user_exists.phone_verified,
});

const build_public_user = (
  user_exists: Pick<
    IUserModel,
    | "_id"
    | "user_name"
    | "user_email"
    | "user_phone"
    | "user_role"
    | "user_status"
    | "email_verified"
    | "phone_verified"
  >,
) => ({
  _id: user_exists._id,
  user_name: user_exists.user_name,
  user_email: user_exists.user_email,
  user_phone: user_exists.user_phone,
  user_role: user_exists.user_role,
  user_status: user_exists.user_status,
  email_verified: user_exists.email_verified,
  phone_verified: user_exists.phone_verified,
});

const assert_account_is_active = (user_exists: {
  is_deleted?: boolean;
  user_status?: string;
}) => {
  if (user_exists.is_deleted || user_exists.user_status !== "active") {
    throw new api_error(httpStatus.FORBIDDEN, "Account is not active");
  }
};

export const auth_service = {
  // ! register
  register: async (
    payload: Partial<IUserModel>,
    request_data?: {
      request_ip?: string;
      request_device?: string;
      user_agent?: string;
    },
  ) => {
    const {
      user_name,
      user_email,
      user_phone,
      user_password,
      user_area,
      user_city,
      user_country,
      user_profile_image,
    } = payload;

    // ! prevent both email and phone together
    if (user_email && user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Provide either email or phone number",
      );
    }

    // ! check email or phone
    if (!user_email && !user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Email or phone number is required",
      );
    }

    // ! check existing email
    if (user_email) {
      const existing_email_user = await user.findOne({
        user_email,
      });

      if (existing_email_user) {
        throw new api_error(httpStatus.BAD_REQUEST, "Email already registered");
      }
    }

    // ! check existing phone
    if (user_phone) {
      const existing_phone_user = await user.findOne({
        user_phone,
      });

      if (existing_phone_user) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "Phone number already registered",
        );
      }
    }

    // ! hash password
    const hashed_password = await bcrypt.hash(user_password!, 12);

    // ! create user
    const created_user = await user.create({
      user_name,
      user_email,
      user_phone,
      user_password: hashed_password,
      user_role: "user",
      user_area,
      user_city,
      user_country,
      user_profile_image,
      email_verified: false,
      phone_verified: false,
    });

    try {
      // ! send otp
      await otp_service.create_and_send({
        otp_type: user_email ? otp_types.email_verify : otp_types.phone_verify,
        user_email,
        user_phone,
        request_ip: request_data?.request_ip || "127.0.0.1",
        request_device: request_data?.request_device || "unknown-device",
        user_agent: request_data?.user_agent || "unknown-user-agent",
      });
    } catch (error) {
      // ! rollback user if otp failed
      await user.deleteOne({
        _id: created_user._id,
      });

      throw error;
    }

    // ! response
    return {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User registered successfully",
      data: {
        user: build_public_user(created_user),
      },
    };
  },

  // ! verify otp for email or phone verification during registration
  verify_otp: async (payload: {
    user_email?: string;
    user_phone?: string;
    verify_otp: string;
  }) => {
    const { user_email, user_phone, verify_otp } = payload;

    // ! prevent both
    if (user_email && user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Provide either email or phone number",
      );
    }

    // ! required
    if (!user_email && !user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Email or phone number is required",
      );
    }

    // ! find user
    const user_exists = await user.findOne({
      $or: [
        ...(user_email ? [{ user_email }] : []),
        ...(user_phone ? [{ user_phone }] : []),
      ],
    });

    // ! user not found
    if (!user_exists) {
      throw new api_error(httpStatus.BAD_REQUEST, "User not found");
    }

    // ! already verified
    if (user_email && user_exists.email_verified) {
      throw new api_error(httpStatus.BAD_REQUEST, "Email already verified");
    }

    if (user_phone && user_exists.phone_verified) {
      throw new api_error(httpStatus.BAD_REQUEST, "Phone already verified");
    }

    // ! verify otp
    await otp_service.verify({
      otp_type: user_email ? otp_types.email_verify : otp_types.phone_verify,

      user_email,
      user_phone,
      verify_otp,
    });

    // ! update verification
    if (user_email) {
      user_exists.email_verified = true;
    }

    if (user_phone) {
      user_exists.phone_verified = true;
    }

    // ! save user
    await user_exists.save();

    // ! jwt payload
    const jwt_payload = build_auth_payload(user_exists);

    // ! generate tokens
    const access_token = token_utils.create.access(jwt_payload);

    const refresh_token = token_utils.create.refresh(jwt_payload);

    // ! response
    return {
      success: true,
      statusCode: httpStatus.OK,
      message: "OTP verified successfully",
      data: {
        access_token,
        refresh_token,
        user: {
          _id: user_exists._id,
          user_name: user_exists.user_name,
          user_email: user_exists.user_email,
          user_phone: user_exists.user_phone,
          email_verified: user_exists.email_verified,
          phone_verified: user_exists.phone_verified,
          user_role: user_exists.user_role,
        },
      },
    };
  },

  // ! resend otp for email or phone verification during registration
  resend_otp: async (
    payload: {
      user_email?: string;
      user_phone?: string;
    },
    request_data?: {
      request_ip?: string;
      request_device?: string;
    },
  ) => {
    const { user_email, user_phone } = payload;

    // ! prevent both
    if (user_email && user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Provide either email or phone number",
      );
    }

    // ! required
    if (!user_email && !user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Email or phone number is required",
      );
    }

    // ! find user
    const user_exists = await user.findOne({
      $or: [
        ...(user_email ? [{ user_email }] : []),
        ...(user_phone ? [{ user_phone }] : []),
      ],
    });

    // ! user not found
    if (!user_exists) {
      throw new api_error(httpStatus.BAD_REQUEST, "User not found");
    }

    // ! already verified
    if (user_email && user_exists.email_verified) {
      throw new api_error(httpStatus.BAD_REQUEST, "Email already verified");
    }

    if (user_phone && user_exists.phone_verified) {
      throw new api_error(httpStatus.BAD_REQUEST, "Phone already verified");
    }

    // ! resend otp
    await otp_service.resend({
      otp_type: user_email ? otp_types.email_verify : otp_types.phone_verify,
      user_email,
      user_phone,
      request_ip: request_data?.request_ip || "127.0.0.1",
      request_device: request_data?.request_device || "unknown-device",
    });

    // ! response
    return {
      success: true,
      statusCode: httpStatus.OK,
      message: "OTP resend successfully",
    };
  },

  // ! login
  login: async (
    payload: {
      user_email?: string;
      user_phone?: string;
      user_password: string;
    },
    request_data?: {
      request_ip?: string;
      request_device?: string;
      user_agent?: string;
    },
  ) => {
    const { user_email, user_phone, user_password } = payload;

    // ! prevent both
    if (user_email && user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Provide either email or phone number",
      );
    }

    // ! required
    if (!user_email && !user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Email or phone number is required",
      );
    }

    // ! find user
    const user_exists = await user
      .findOne({
        $or: [
          ...(user_email ? [{ user_email }] : []),
          ...(user_phone ? [{ user_phone }] : []),
        ],
      })
      .select("+user_password");

    // ! invalid credentials
    if (!user_exists) {
      throw new api_error(httpStatus.BAD_REQUEST, "Invalid credentials");
    }

    // ! deleted user
    if (user_exists.is_deleted) {
      throw new api_error(httpStatus.FORBIDDEN, "Account deleted");
    }

    // ! banned user
    if (user_exists.user_status === "banned") {
      throw new api_error(httpStatus.FORBIDDEN, "Account banned");
    }

    // ! deactive user
    if (user_exists.user_status === "deactive") {
      throw new api_error(httpStatus.FORBIDDEN, "Account deactivated");
    }

    // ! email verify check
    if (user_email && !user_exists.email_verified) {
      throw new api_error(httpStatus.UNAUTHORIZED, "Email not verified");
    }

    // ! phone verify check
    if (user_phone && !user_exists.phone_verified) {
      throw new api_error(httpStatus.UNAUTHORIZED, "Phone number not verified");
    }

    // ! compare password
    const password_matched = await bcrypt.compare(
      user_password,
      user_exists.user_password,
    );

    // ! invalid password
    if (!password_matched) {
      throw new api_error(httpStatus.BAD_REQUEST, "Invalid credentials");
    }

    // ! 2FA enabled
    if (user_exists.two_factor_enabled) {
      const is_email_2fa = user_exists.two_factor_otp_method === "email";

      const otp_send_to = is_email_2fa
        ? user_exists.user_email
        : user_exists.user_phone;

      await otp_service.create_and_send({
        otp_type: otp_types.login_2fa,

        ...(is_email_2fa
          ? { user_email: otp_send_to }
          : { user_phone: otp_send_to }),

        request_ip: request_data?.request_ip || "127.0.0.1",
        request_device: request_data?.request_device || "unknown-device",
        user_agent: request_data?.user_agent || "unknown-user-agent",
      });

      return {
        success: true,
        statusCode: httpStatus.OK,
        message: "2FA OTP sent successfully",
        data: {
          requires_2fa: true,
          method: user_exists.two_factor_otp_method,
        },
      };
    }

    // ! jwt payload
    const jwt_payload = build_auth_payload(user_exists);

    // ! generate tokens
    const access_token = token_utils.create.access(jwt_payload);
    const refresh_token = token_utils.create.refresh(jwt_payload);

    // ! response
    return {
      success: true,
      statusCode: httpStatus.OK,
      message: "Login successful",
      data: {
        requires_2fa: false,
        access_token,
        refresh_token,
        user: {
          _id: user_exists._id,
          user_name: user_exists.user_name,
          user_email: user_exists.user_email,
          user_phone: user_exists.user_phone,
          email_verified: user_exists.email_verified,
          phone_verified: user_exists.phone_verified,
          user_role: user_exists.user_role,
          user_status: user_exists.user_status,
        },
      },
    };
  },

  // ! verify login 2fa
  verify_login_2fa: async (payload: {
    user_email?: string;
    user_phone?: string;
    verify_otp: string;
  }) => {
    const { user_email, user_phone, verify_otp } = payload;

    if (user_email && user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Provide either email or phone number",
      );
    }

    if (!user_email && !user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Email or phone number is required",
      );
    }

    const user_exists = await user.findOne({
      $or: [
        ...(user_email ? [{ user_email }] : []),
        ...(user_phone ? [{ user_phone }] : []),
      ],
    });

    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    if (!user_exists.two_factor_enabled) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Two-factor authentication is not enabled",
      );
    }

    const is_email_2fa = user_exists.two_factor_otp_method === "email";

    await otp_service.verify({
      otp_type: otp_types.login_2fa,

      ...(is_email_2fa
        ? { user_email: user_exists.user_email }
        : { user_phone: user_exists.user_phone }),

      verify_otp,
    });
    // ! jwt payload
    const jwt_payload = build_auth_payload(user_exists);

    // ! generate tokens
    const access_token = token_utils.create.access(jwt_payload);
    const refresh_token = token_utils.create.refresh(jwt_payload);

    return {
      success: true,
      statusCode: httpStatus.OK,
      message: "2FA verification successful",
      data: {
        access_token,
        refresh_token,
        user: {
          _id: user_exists._id,
          user_name: user_exists.user_name,
          user_email: user_exists.user_email,
          user_phone: user_exists.user_phone,
          email_verified: user_exists.email_verified,
          phone_verified: user_exists.phone_verified,
          user_role: user_exists.user_role,
          user_status: user_exists.user_status,
        },
      },
    };
  },

  refresh_token: async (refresh_token: string) => {
    if (!refresh_token) {
      throw new api_error(httpStatus.UNAUTHORIZED, "Refresh token is required");
    }

    const verifiedToken =
      token_utils.verify.refresh<IJwtPayload>(refresh_token);

    if (!verifiedToken.success || !verifiedToken.data?._id) {
      throw new api_error(httpStatus.UNAUTHORIZED, "Invalid refresh token");
    }

    const user_exists = await user.findById(verifiedToken.data._id);

    if (!user_exists) {
      throw new api_error(httpStatus.UNAUTHORIZED, "User not found");
    }

    assert_account_is_active(user_exists);

    const tokenIssuedAt = verifiedToken.data.iat;
    if (
      user_exists.password_changed_at &&
      tokenIssuedAt &&
      user_exists.password_changed_at.getTime() > tokenIssuedAt * 1000
    ) {
      throw new api_error(
        httpStatus.UNAUTHORIZED,
        "Refresh token is no longer valid",
      );
    }

    const jwt_payload = build_auth_payload(user_exists);

    return {
      success: true,
      statusCode: httpStatus.OK,
      message: "Token refreshed successfully",
      data: {
        access_token: token_utils.create.access(jwt_payload),
        refresh_token: token_utils.create.refresh(jwt_payload),
        user: build_public_user(user_exists),
      },
    };
  },

  // ! get logged user
  get_me: async (user_id: string) => {
    // ! find user
    const user_exists = await user
      .findById(user_id)
      .select("-user_password")
      .lean();

    // ! user not found
    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    // ! response
    return {
      success: true,
      statusCode: httpStatus.OK,
      message: "User retrieved successfully",

      data: {
        user: user_exists,
      },
    };
  },

  // ! logout user
  // logout: async (session_token: string) => {
  //   await session_service.logout_session(session_token);
  //   return {
  //     success: true,
  //   };
  // },

  // ! enable  2fa
  enable_2fa: async (
    user_id: string,
    two_factor_otp_method: "email" | "phone",
    request_data?: {
      request_ip?: string;
      request_device?: string;
      user_agent?: string;
    },
  ) => {
    // ! find user
    const user_exists = await user.findById(user_id);
    // ! user not found
    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    assert_account_is_active(user_exists);

    // ! validate 2FA method
    if (two_factor_otp_method === "email") {
      if (!user_exists.user_email) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "No email address is associated with this account",
        );
      }

      if (!user_exists.email_verified) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "Email address is not verified",
        );
      }
    }

    if (two_factor_otp_method === "phone") {
      if (!user_exists.user_phone) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "No phone number is associated with this account",
        );
      }

      if (!user_exists.phone_verified) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "Phone number is not verified",
        );
      }
    }

    //! send code to enable 2FA
    const is_email_2fa = two_factor_otp_method === "email";
    const otp_send_to = is_email_2fa
      ? user_exists.user_email
      : user_exists.user_phone;

    await otp_service.create_and_send({
      otp_type: otp_types.enable_2fa,
      ...(is_email_2fa
        ? { user_email: otp_send_to }
        : { user_phone: otp_send_to }),
      request_ip: request_data?.request_ip || "127.0.0.1",
      request_device: request_data?.request_device || "unknown-device",
      user_agent: request_data?.user_agent || "unknown-user-agent",
    });

    user_exists.pending_two_factor_method = two_factor_otp_method;
    await user_exists.save();

    return {
      success: true,
      message: "2FA enable OTP sent successfully",
      data: {
        two_factor_otp_method,
      },
    };
  },

  // ! toggle 2fa
  toggle_2fa: async (user_id: string, req_body: any) => {
    // ! find user
    const user_exists = await user.findById(user_id);
    // ! user not found
    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    assert_account_is_active(user_exists);

    if (req_body.enabled && user_exists.two_factor_enabled) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Two-factor authentication is already enabled",
      );
    }

    if (!req_body.enabled && !user_exists.two_factor_enabled) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Two-factor authentication is already disabled",
      );
    }

    // ! enabling 2FA
    if (req_body.enabled) {
      if (!user_exists.pending_two_factor_method) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "No pending 2FA enable request found",
        );
      }

      const is_email_2fa = user_exists.pending_two_factor_method === "email";
      const otp_verify_to = is_email_2fa
        ? user_exists.user_email
        : user_exists.user_phone;

      // ! verify otp
      await otp_service.verify({
        otp_type: otp_types.enable_2fa,
        ...(is_email_2fa
          ? { user_email: otp_verify_to }
          : { user_phone: otp_verify_to }),

        verify_otp: req_body.verify_otp,
      });
    }

    // ! update 2fa status
    if (req_body.enabled) {
      user_exists.two_factor_enabled = true;

      if (user_exists.pending_two_factor_method) {
        user_exists.two_factor_otp_method =
          user_exists.pending_two_factor_method;

        user_exists.pending_two_factor_method = undefined;
      }
    } else {
      user_exists.two_factor_enabled = false;
    }

    await user_exists.save();

    return {
      success: true,
      message: req_body.enabled
        ? "Two-factor authentication enabled successfully"
        : "Two-factor authentication disabled successfully",
    };
  },

  // ! request password change
  change_password_request: async (
    user_id: string,
    current_password: string,
    request_data?: any,
  ) => {
    // ! find user
    const user_exists = await user.findById(user_id).select("+user_password");

    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    assert_account_is_active(user_exists);

    // ! verify old password
    const password_matched = await bcrypt.compare(
      current_password,
      user_exists.user_password,
    );

    if (!password_matched) {
      throw new api_error(httpStatus.BAD_REQUEST, "Invalid old password");
    }

    // ! if 2fa disabled, no otp needed
    if (!user_exists.two_factor_enabled) {
      return {
        require_2fa: false,
      };
    }

    const is_email_2fa = user_exists.two_factor_otp_method === "email";

    const otp_send_to = is_email_2fa
      ? user_exists.user_email
      : user_exists.user_phone;

    // ! send otp
    await otp_service.create_and_send({
      otp_type: otp_types.change_password,

      ...(is_email_2fa
        ? { user_email: otp_send_to }
        : { user_phone: otp_send_to }),

      request_ip: request_data?.request_ip || "127.0.0.1",
      request_device: request_data?.request_device || "unknown-device",
    });

    return {
      require_2fa: true,
    };
  },

  // ! confirm password change
  change_password_confirm: async (
    user_id: string,
    new_password: string,
    verify_otp?: string,
  ) => {
    // ! find user
    const user_exists = await user.findById(user_id).select("+user_password");

    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    // ! verify 2fa otp
    if (user_exists.two_factor_enabled) {
      if (!verify_otp) {
        throw new api_error(httpStatus.BAD_REQUEST, "OTP is required");
      }

      const is_email_2fa = user_exists.two_factor_otp_method === "email";

      const otp_verify_to = is_email_2fa
        ? user_exists.user_email
        : user_exists.user_phone;

      await otp_service.verify({
        otp_type: otp_types.change_password,

        ...(is_email_2fa
          ? { user_email: otp_verify_to }
          : { user_phone: otp_verify_to }),

        verify_otp,
      });
    }

    const current_password_match = await bcrypt.compare(
      new_password,
      user_exists.user_password,
    );

    if (current_password_match) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "New password must be different from current password",
      );
    }

    // ! hash password
    const hashed_new_password = await bcrypt.hash(new_password, 12);

    // ! update password
    user_exists.user_password = hashed_new_password;

    // ! logout all devices (recommended)
    user_exists.password_changed_at = new Date();

    await user_exists.save();

    return {
      success: true,
      message: "Password changed successfully",
    };
  },

  //! forgot password
  forgot_password: async (
    user_email?: string,
    user_phone?: string,
    request_data?: {
      request_ip?: string;
      request_device?: string;
      user_agent?: string;
    },
  ) => {
    if (user_email && user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Provide either email or phone number",
      );
    }

    if (!user_email && !user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Email or phone number is required",
      );
    }
    // ! find user
    const user_exists = await user.findOne({
      $or: [
        ...(user_email ? [{ user_email }] : []),
        ...(user_phone ? [{ user_phone }] : []),
      ],
    });

    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    if (user_exists.user_email) {
      if (!user_exists.email_verified) {
        throw new api_error(httpStatus.BAD_REQUEST, "Email is not verified");
      }
    } else if (user_exists.user_phone) {
      if (!user_exists.phone_verified) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "Phone number is not verified",
        );
      }
    } else {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "No email or phone number associated with this account",
      );
    }

    const is_email = !!user_exists.user_email;
    const otp_send_to = is_email
      ? user_exists.user_email
      : user_exists.user_phone;
    // ! send otp
    await otp_service.create_and_send({
      otp_type: otp_types.forgot_password,
      ...(is_email ? { user_email: otp_send_to } : { user_phone: otp_send_to }),
      request_ip: request_data?.request_ip || "127.0.0.1",
      request_device: request_data?.request_device || "unknown-device",
      user_agent: request_data?.user_agent || "unknown-user-agent",
    });
    return {
      success: true,
      message:
        "Password reset OTP sent to your " + (is_email ? "email" : "phone"),
    };
  },

  //! reset password
  reset_password: async (
    new_password: string,
    verify_otp: string,
    user_email?: string,
    user_phone?: string,
  ) => {
    if (user_email && user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Provide either email or phone number",
      );
    }

    if (!user_email && !user_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Email or phone number is required",
      );
    }
    // ! find user
    const user_exists = await user
      .findOne({
        $or: [
          ...(user_email ? [{ user_email }] : []),
          ...(user_phone ? [{ user_phone }] : []),
        ],
      })
      .select("+user_password");

    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    const is_email = !!user_exists.user_email;
    const otp_verify_to = is_email
      ? user_exists.user_email
      : user_exists.user_phone;
    // ! verify otp
    await otp_service.verify({
      otp_type: otp_types.forgot_password,
      ...(is_email
        ? { user_email: otp_verify_to }
        : { user_phone: otp_verify_to }),
      verify_otp,
    });

    const same_password = await bcrypt.compare(
      new_password,
      user_exists.user_password,
    );

    if (same_password) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "New password must be different from current password",
      );
    }

    // ! hash password
    const hashed_new_password = await bcrypt.hash(new_password, 12);

    // ! update password
    user_exists.user_password = hashed_new_password;

    // ! logout all devices (recommended)
    user_exists.password_changed_at = new Date();
    await user_exists.save();

    return {
      success: true,
      message: "Password reset successfully",
    };
  },

  // ! change email or phone number request
  change_contact_request: async (
    user_id: string,
    new_email?: string,
    new_phone?: string,
    request_data?: {
      request_ip?: string;
      request_device?: string;
      user_agent?: string;
    },
  ) => {
    // ! find user
    const user_exists = await user.findById(user_id);
    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    if (new_email && new_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "Provide either email or phone number",
      );
    }

    if (!new_email && !new_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "New email or phone number is required",
      );
    }

    if (new_email) {
      if (user_exists.user_email === new_email) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "New email is the same as the current email",
        );
      }
      const email_exists = await user.findOne({
        user_email: new_email,
      });
      if (email_exists) {
        throw new api_error(httpStatus.BAD_REQUEST, "Email already in use");
      }
    } else if (new_phone) {
      if (user_exists.user_phone === new_phone) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "New phone number is the same as the current phone number",
        );
      }
      const phone_exists = await user.findOne({
        user_phone: new_phone,
      });
      if (phone_exists) {
        throw new api_error(
          httpStatus.BAD_REQUEST,
          "Phone number already in use",
        );
      }
    } else {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "New email or phone number is required",
      );
    }

    if (new_email) {
      user_exists.pending_email = new_email;
    }

    if (new_phone) {
      user_exists.pending_phone = new_phone;
    }

    await user_exists.save();
    // ! send otp to new contact
    const is_email = !!new_email;
    const otp_send_to = is_email ? new_email : new_phone;
    await otp_service.create_and_send({
      otp_type: otp_types.change_contact,
      ...(is_email ? { user_email: otp_send_to } : { user_phone: otp_send_to }),
      request_ip: request_data?.request_ip || "127.0.0.1",
      request_device: request_data?.request_device || "unknown-device",
      user_agent: request_data?.user_agent || "unknown-user-agent",
    });
    return {
      success: true,
      message: "OTP sent to your " + (is_email ? "email" : "phone"),
    };
  },

  // ! confirm email or phone number change
  change_contact_confirm: async (user_id: string, verify_otp: string) => {
    const user_exists = await user.findById(user_id);

    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    assert_account_is_active(user_exists);

    const new_email = user_exists.pending_email;
    const new_phone = user_exists.pending_phone;

    if (!new_email && !new_phone) {
      throw new api_error(
        httpStatus.BAD_REQUEST,
        "No pending contact change request found",
      );
    }

    const is_email = !!new_email;
    const otp_verify_to = is_email
      ? (new_email as string)
      : (new_phone as string);

    await otp_service.verify({
      otp_type: otp_types.change_contact,
      ...(is_email
        ? { user_email: otp_verify_to }
        : { user_phone: otp_verify_to }),
      verify_otp,
    });

    if (is_email) {
      user_exists.user_email = new_email as string;
      user_exists.email_verified = true;
      user_exists.pending_email = undefined;
    } else {
      user_exists.user_phone = new_phone as string;
      user_exists.phone_verified = true;
      user_exists.pending_phone = undefined;
    }

    await user_exists.save();

    return {
      success: true,
      message: `${is_email ? "Email" : "Phone number"} changed successfully`,
    };
  },

  google_auth: async () => {
    const result = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: `${process.env.APP_URL}/auth/google-success`,
      },
    });

    if (!result?.url) {
      throw new api_error(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to generate Google authentication URL",
      );
    }

    return result.url;
  },
};
