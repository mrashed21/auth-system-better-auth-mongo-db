import api_error from "@/app/helper/api-error";
import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { IJwtPayload } from "../../utils/jwt";
import { token_utils } from "../../utils/token";
import { otp_service } from "../otp/opt.service";
import { otp_types } from "../otp/otp.interface";
import { IUserModel } from "./auth.interface";
import { user } from "./auth.model";

export const auth_service = {
  // ! register
  register: async (
    payload: Partial<IUserModel>,
    request_data?: {
      request_ip?: string;
      request_device?: string;
    },
  ) => {
    const {
      user_name,
      user_email,
      user_phone,
      user_password,
      user_role,
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
      user_role: user_role || "user",
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
        user: {
          _id: created_user._id,
          user_name: created_user.user_name,
          user_email: created_user.user_email,
          user_phone: created_user.user_phone,
          user_role: created_user.user_role,
          email_verified: created_user.email_verified,
          phone_verified: created_user.phone_verified,
        },
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
    const jwt_payload: IJwtPayload = {
      _id: user_exists._id.toString(),
      user_role: user_exists.user_role,
      user_email: user_exists.user_email,
      user_phone: user_exists.user_phone,
      user_email_verified: user_exists.email_verified,
      user_phone_verified: user_exists.phone_verified,
    };

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
      // ! send otp
      await otp_service.create_and_send({
        otp_type: otp_types.login_2fa,
        user_email: user_exists.user_email,
        user_phone: user_exists.user_phone,
        request_ip: request_data?.request_ip || "127.0.0.1",
        request_device: request_data?.request_device || "unknown-device",
      });

      return {
        success: true,
        statusCode: httpStatus.OK,
        message: "2FA OTP sent successfully",
        data: {
          requires_2fa: true,
          user_email: user_exists.user_email,
          user_phone: user_exists.user_phone,
        },
      };
    }

    // ! jwt payload
    const jwt_payload: IJwtPayload = {
      _id: user_exists._id.toString(),
      user_role: user_exists.user_role,
      user_email: user_exists.user_email,
      user_phone: user_exists.user_phone,
      user_email_verified: user_exists.email_verified,
      user_phone_verified: user_exists.phone_verified,
    };

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

    // ! verify otp
    await otp_service.verify({
      otp_type: otp_types.login_2fa,
      user_email,
      user_phone,
      verify_otp,
    });

    // ! jwt payload
    const jwt_payload: IJwtPayload = {
      _id: user_exists._id.toString(),
      user_role: user_exists.user_role,
      user_email: user_exists.user_email,
      user_phone: user_exists.user_phone,
      user_email_verified: user_exists.email_verified,
      user_phone_verified: user_exists.phone_verified,
    };

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

    // ! deleted user
    if (user_exists.is_deleted) {
      throw new api_error(httpStatus.FORBIDDEN, "Account deleted");
    }

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

    if (user_exists) {
      await otp_service.create_and_send({
        otp_type: otp_types.enable_2fa,
        ...(is_email_2fa
          ? { user_email: otp_send_to }
          : { user_phone: otp_send_to }),
        request_ip: request_data?.request_ip || "127.0.0.1",
        request_device: request_data?.request_device || "unknown-device",
        user_agent: request_data?.user_agent || "unknown-user-agent",
      });
    }

    // ! update 2fa
    user_exists.two_factor_otp_method = two_factor_otp_method;
    await user_exists.save();
  },

  // ! toggle 2fa
  toggle_2fa: async (user_id: string, req_body: any) => {
    // ! find user
    const user_exists = await user.findById(user_id);
    // ! user not found
    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }
    // ! enabling 2FA
    if (req_body.enabled) {
      const is_email_2fa = user_exists.two_factor_otp_method === "email";
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
    user_exists.two_factor_enabled = req_body.enabled;
    await user_exists.save();

    return {
      success: true,
      message: req_body.enabled
        ? "Two-factor authentication enabled successfully"
        : "Two-factor authentication disabled successfully",
    };
  },

  // !change password
  change_password: async (
    user_id: string,
    old_password: string,
    new_password: string,
  ) => {
    // ! find user
    const user_exists = await user.findById(user_id).select("+user_password");
    // ! user not found
    if (!user_exists) {
      throw new api_error(httpStatus.NOT_FOUND, "User not found");
    }

    // ! compare old password
    const password_matched = await bcrypt.compare(
      old_password,
      user_exists.user_password,
    );
    // ! invalid old password
    if (!password_matched) {
      throw new api_error(httpStatus.BAD_REQUEST, "Invalid old password");
    }
    // ! hash new password
    const hashed_new_password = await bcrypt.hash(new_password, 12);
    // ! update password
    user_exists.user_password = hashed_new_password;
    await user_exists.save();
  },
};
