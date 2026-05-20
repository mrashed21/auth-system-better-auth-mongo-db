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

    // ! create tokens

    const access_token = token_utils.create.access(jwt_payload);

    const refresh_token = token_utils.create.refresh(jwt_payload);

    // ! response

    return {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User registered successfully",
      data: {
        access_token,
        refresh_token,
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

  get_all_users: async () => {
    const users = await user.find();
    // const users = await user.find().select("-user_password");

    return users;
  },
};
