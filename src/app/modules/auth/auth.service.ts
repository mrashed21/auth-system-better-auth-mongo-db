// register.service.ts

import bcrypt from "bcrypt";
import httpStatus from "http-status";

import { IUserModel } from "./auth.interface";
import { user } from "./auth.model";

import { IJwtPayload } from "../../utils/jwt";

import api_error from "@/app/helper/api-error";
import { token_utils } from "../../utils/token";

const generate_otp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const auth_service = {
  // ! register
  register: async (payload: Partial<IUserModel>) => {
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

    // ! generate otp
    const verify_otp = generate_otp();
    // ! otp expire time
    const otp_expires_at = new Date();

    otp_expires_at.setMinutes(otp_expires_at.getMinutes() + 5);

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
      verify_otp,
      otp_expires_at,
      email_verified: false,
      phone_verified: false,
      otp_sent_count: 1,
      otp_last_sent_at: new Date(),
      otp_count_resend_at: new Date(),
    });

    // ! send otp email

    if (user_email) {
      console.log(`
      ========================================
      EMAIL OTP SENT
      ========================================
      Email: ${user_email}
      Expire At: ${otp_expires_at.toLocaleString()}
      OTP: ${verify_otp}
      ========================================
      `);
    }

    // ! send otp phone

    if (user_phone) {
      console.log(`
        PHONE OTP SENT
        ========================================
        Phone: ${user_phone}
        ========================================
        Expire At: ${otp_expires_at.toLocaleString()}
        OTP: ${verify_otp}
        ========================================
        `);
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
  //! verify otp
  verify_otp: async (payload: {
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

    // ! already verified
    if (user_email && user_exists.email_verified) {
      throw new api_error(httpStatus.BAD_REQUEST, "Email already verified");
    }

    if (user_phone && user_exists.phone_verified) {
      throw new api_error(httpStatus.BAD_REQUEST, "Phone already verified");
    }

    // ! otp exists
    if (!user_exists.verify_otp || !user_exists.otp_expires_at) {
      throw new api_error(httpStatus.BAD_REQUEST, "OTP not found");
    }

    // ! check otp expire
    if (user_exists.otp_expires_at < new Date()) {
      throw new api_error(httpStatus.BAD_REQUEST, "OTP expired");
    }

    // ! verify otp
    if (String(user_exists.verify_otp) !== String(verify_otp)) {
      user_exists.otp_verify_attempts =
        (user_exists.otp_verify_attempts ?? 0) + 1;

      // ! block after 5 attempts

      if (user_exists.otp_verify_attempts >= 5) {
        const blocked_until = new Date();

        blocked_until.setMinutes(blocked_until.getMinutes() + 15);

        user_exists.otp_blocked_until = blocked_until;

        await user_exists.save();

        throw new api_error(
          httpStatus.TOO_MANY_REQUESTS,
          "Too many failed attempts. Try again after 15 minutes",
        );
      }

      await user_exists.save();

      throw new api_error(
        httpStatus.BAD_REQUEST,
        `Invalid OTP. Remaining attempts: ${
          5 - user_exists.otp_verify_attempts
        }`,
      );
    }

    // ! update verification
    if (user_email) {
      user_exists.email_verified = true;
    }

    if (user_phone) {
      user_exists.phone_verified = true;
    }

    // ! clear otp
    user_exists.verify_otp = null;
    user_exists.otp_expires_at = null;

    // ! save user
    await user_exists.save();

    // ! jwt payload
    const jwt_payload: IJwtPayload = {
      id: user_exists._id.toString(),
      role: user_exists.user_role,
      email_verified: user_exists.email_verified,
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

  // ! resend otp
  resend_otp: async (payload: { user_email?: string; user_phone?: string }) => {
    const { user_email, user_phone } = payload;

    // ! check email or phone
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

    // ! blocked user check
    if (
      user_exists.otp_blocked_until &&
      user_exists.otp_blocked_until > new Date()
    ) {
      const remaining_minutes = Math.ceil(
        (user_exists.otp_blocked_until.getTime() - Date.now()) / (1000 * 60),
      );

      throw new api_error(
        httpStatus.TOO_MANY_REQUESTS,
        `Too many failed attempts. Try again after ${remaining_minutes} minutes`,
      );
    }

    // ! current time
    const now = new Date();

    // ! initialize resend time
    if (!user_exists.otp_count_resend_at) {
      user_exists.otp_count_resend_at = now;
    }

    // ! resend counter after 1 hour
    const one_hour = 1000 * 60 * 60;
    const resend_diff =
      now.getTime() - user_exists.otp_count_resend_at.getTime();

    if (resend_diff > one_hour) {
      user_exists.otp_sent_count = 0;
      user_exists.otp_count_resend_at = now;
    }

    // ! max 5 otp per hour
    if ((user_exists.otp_sent_count ?? 0) >= 5) {
      throw new api_error(
        httpStatus.TOO_MANY_REQUESTS,
        "Maximum OTP request limit exceeded. Try again after 1 hour",
      );
    }

    // ! 3 minute cooldown
    if (user_exists.otp_last_sent_at) {
      const three_minutes = 1000 * 60 * 3;

      const cooldown_diff =
        now.getTime() - user_exists.otp_last_sent_at.getTime();

      if (cooldown_diff < three_minutes) {
        const remaining_seconds = Math.ceil(
          (three_minutes - cooldown_diff) / 1000,
        );

        const minutes = Math.floor(remaining_seconds / 60);

        const seconds = remaining_seconds % 60;

        throw new api_error(
          httpStatus.TOO_MANY_REQUESTS,
          `Please wait ${minutes}m ${seconds}s before requesting another OTP`,
        );
      }
    }

    // ! generate new otp
    const verify_otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ! otp expire time
    const otp_expires_at = new Date();

    otp_expires_at.setMinutes(otp_expires_at.getMinutes() + 5);

    // ! update otp data
    user_exists.verify_otp = verify_otp;
    user_exists.otp_expires_at = otp_expires_at;
    user_exists.otp_last_sent_at = now;
    user_exists.otp_sent_count = (user_exists.otp_sent_count ?? 0) + 1;

    // ! resend verify attempts
    user_exists.otp_verify_attempts = 0;
    user_exists.otp_blocked_until = null;

    // ! save user
    await user_exists.save();

    // ! send email otp
    if (user_email) {
      console.log(`
      ========================================
      resend EMAIL OTP
      ========================================
      Email: ${user_email}
      OTP: ${verify_otp}
      Expire At: ${otp_expires_at.toLocaleString()}
      OTP Count: ${user_exists.otp_sent_count}/5
      ========================================
      `);
    }

    // ! send phone otp

    if (user_phone) {
      console.log(`
      ========================================
      resend PHONE OTP
      ========================================
      Phone: ${user_phone}
      OTP: ${verify_otp}
      Expire At: ${otp_expires_at.toLocaleString()}
      OTP Count: ${user_exists.otp_sent_count}/5
      ========================================
      `);
    }

    // ! response
    return {
      success: true,
      statusCode: httpStatus.OK,
      message: "OTP resend successfully",
    };
  },

  // ! login
  login: async (payload: {
    user_email?: string;
    user_phone?: string;
    user_password: string;
  }) => {
    const { user_email, user_phone, user_password } = payload;

    // ! check email or phone
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

    // ! user not found
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

    // ! email verification check
    if (user_email && !user_exists.email_verified) {
      throw new api_error(httpStatus.UNAUTHORIZED, "Email not verified");
    }

    // ! phone verification check
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

    // ! jwt payload
    const jwt_payload: IJwtPayload = {
      id: user_exists._id.toString(),
      role: user_exists.user_role,
      email_verified: user_exists.email_verified,
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
  get_all_users: async () => {
    // const users = await user.find();
    const users = await user.find().select("-user_password");

    return users;
  },
};
