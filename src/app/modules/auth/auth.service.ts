import { user } from "./auth.model";

import bcrypt from "bcrypt";
import httpStatus from "http-status";

import api_error from "@/app/helper/api-error";
import { IUserModel } from "./auth.interface";

export const auth_service = {
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

    //  ! check email or phone
    if (!user_email && !user_phone) {
      throw new Error("Email or phone number is required");
    }

    //! check existing email
    if (user_email) {
      const existing_email_user = await user.findOne({
        user_email,
      });

      if (existing_email_user) {
        throw new api_error(httpStatus.BAD_REQUEST, "Email already registered");
      }
    }

    //! check existing phone

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

    //! hash password

    const hashed_password = await bcrypt.hash(user_password!, 12);

    //! generate otp

    const verify_otp = Math.floor(100000 + Math.random() * 900000).toString();

    //! create user

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
    });

    //! send otp

    if (user_email) {
      console.log(`
        ========================================
        EMAIL OTP SENT
        ========================================
        Email: ${user_email}
        OTP: ${verify_otp}
        ========================================
        `);
    }

    if (user_phone) {
      console.log(`
        PHONE OTP SENT
        ========================================
        Phone: ${user_phone}
        ========================================
        ========================================
        OTP: ${verify_otp}
      }
      `);
    }
    //! response

    return {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User registered successfully",
      data: {
        _id: created_user._id,
        user_name: created_user.user_name,
        user_email: created_user.user_email,
        user_phone: created_user.user_phone,
      },
    };
  },
  get_all_users: async () => {
    const users = await user.find();
    // const users = await user.find().select("-user_password");

    return users;
  },
};
