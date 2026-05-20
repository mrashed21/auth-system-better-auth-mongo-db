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

    // ! jwt payload

    const jwt_payload: IJwtPayload = {
      id: created_user._id.toString(),

      role: created_user.user_role,

      email_verified: created_user.email_verified,
    };

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
  // verify otp
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

    if (user_exists.verify_otp !== verify_otp) {
      throw new api_error(httpStatus.BAD_REQUEST, "Invalid OTP");
    }

    // ! update verification

    if (user_email) {
      user_exists.email_verified = true;
    }

    if (user_phone) {
      user_exists.phone_verified = true;
    }

    // ! clear otp
    user_exists.verify_otp = undefined;

    user_exists.otp_expires_at = undefined;

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

  get_all_users: async () => {
    const users = await user.find();
    // const users = await user.find().select("-user_password");

    return users;
  },
};
