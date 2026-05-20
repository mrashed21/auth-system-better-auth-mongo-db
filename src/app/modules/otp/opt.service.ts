import bcrypt from "bcryptjs";
import httpStatus from "http-status";

import api_error from "@/app/helper/api-error";

import { otp_types } from "./otp.interface";
import { otp } from "./otp.model";

const generate_otp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const otp_service = {
  // ! create and send otp
  create_and_send: async (payload: {
    otp_type: (typeof otp_types)[keyof typeof otp_types];
    user_email?: string;
    user_phone?: string;
    request_ip: string;
    request_device: string;
  }) => {
    const { otp_type, user_email, user_phone, request_ip, request_device } =
      payload;

    // ! generate otp
    const plain_otp = generate_otp();

    // ! hash otp
    const hashed_otp = await bcrypt.hash(plain_otp, 12);

    // ! expire time
    const otp_expires_at = new Date();

    otp_expires_at.setMinutes(otp_expires_at.getMinutes() + 5);

    // ! delete previous otp
    await otp.deleteMany({
      otp_type,
      $or: [
        ...(user_email ? [{ user_email }] : []),
        ...(user_phone ? [{ user_phone }] : []),
      ],
    });

    // ! create otp
    const created_otp = await otp.create({
      otp_type,
      user_email,
      user_phone,
      verify_otp: hashed_otp,
      otp_expires_at,
      otp_verified: false,
      otp_verify_attempts: 0,
      otp_sent_count: 1,
      otp_last_sent_at: new Date(),
      otp_count_reset_at: new Date(),
      request_ip,
      request_device,
    });

    // ! send email otp
    if (user_email) {
      console.log(`
        ========================================
        EMAIL OTP SENT
        ========================================
        Email: ${user_email}
        OTP: ${plain_otp}
        Expire At: ${otp_expires_at.toLocaleString()}
        ========================================
            `);
    }

    // ! send phone otp
    if (user_phone) {
      console.log(`
        ========================================
        PHONE OTP SENT
        ========================================
        Phone: ${user_phone}
        OTP: ${plain_otp}
        Expire At: ${otp_expires_at.toLocaleString()}
        ========================================
        `);
    }

    return created_otp;
  },

  // ! verify otp
  verify: async (payload: {
    otp_type: (typeof otp_types)[keyof typeof otp_types];
    verify_otp: string;
    user_email?: string;
    user_phone?: string;
  }) => {
    const { otp_type, verify_otp, user_email, user_phone } = payload;

    // ! find otp
    const otp_exists = await otp.findOne({
      otp_type,
      $or: [
        ...(user_email ? [{ user_email }] : []),
        ...(user_phone ? [{ user_phone }] : []),
      ],
    });

    // ! otp not found
    if (!otp_exists) {
      throw new api_error(httpStatus.BAD_REQUEST, "OTP not found");
    }

    // ! blocked check
    if (
      otp_exists.otp_blocked_until &&
      otp_exists.otp_blocked_until > new Date()
    ) {
      throw new api_error(
        httpStatus.TOO_MANY_REQUESTS,
        "Too many failed attempts. Try again later",
      );
    }

    // ! expire check
    if (!otp_exists.otp_expires_at || otp_exists.otp_expires_at < new Date()) {
      throw new api_error(httpStatus.BAD_REQUEST, "OTP expired");
    }

    // ! compare otp
    const otp_matched = await bcrypt.compare(
      verify_otp,
      otp_exists.verify_otp!,
    );

    // ! invalid otp
    if (!otp_matched) {
      otp_exists.otp_verify_attempts =
        (otp_exists.otp_verify_attempts ?? 0) + 1;

      // ! block after 5 attempts
      if (otp_exists.otp_verify_attempts >= 5) {
        const blocked_until = new Date();

        blocked_until.setMinutes(blocked_until.getMinutes() + 15);

        otp_exists.otp_blocked_until = blocked_until;
      }

      await otp_exists.save();

      throw new api_error(httpStatus.BAD_REQUEST, "Invalid OTP");
    }

    // ! verified
    otp_exists.otp_verified = true;

    await otp_exists.save();

    // ! delete otp after verify
    await otp.deleteOne({
      _id: otp_exists._id,
    });

    return true;
  },

  // ! resend otp
  resend: async (payload: {
    otp_type: (typeof otp_types)[keyof typeof otp_types];
    user_email?: string;
    user_phone?: string;
    request_ip: string;
    request_device: string;
  }) => {
    const { otp_type, user_email, user_phone, request_ip, request_device } =
      payload;

    // ! existing otp
    const otp_exists = await otp.findOne({
      otp_type,
      $or: [
        ...(user_email ? [{ user_email }] : []),
        ...(user_phone ? [{ user_phone }] : []),
      ],
    });

    // ! no otp found
    if (!otp_exists) {
      throw new api_error(httpStatus.BAD_REQUEST, "OTP not found");
    }

    // ! cooldown check
    if (otp_exists.otp_last_sent_at) {
      const diff = Date.now() - otp_exists.otp_last_sent_at.getTime();

      if (diff < 1000 * 60 * 3) {
        throw new api_error(
          httpStatus.TOO_MANY_REQUESTS,
          "Please wait before requesting another OTP",
        );
      }
    }

    // ! max resend check
    if ((otp_exists.otp_sent_count ?? 0) >= 5) {
      throw new api_error(
        httpStatus.TOO_MANY_REQUESTS,
        "Maximum OTP resend limit exceeded",
      );
    }

    // ! generate otp
    const plain_otp = generate_otp();

    // ! hash otp
    const hashed_otp = await bcrypt.hash(plain_otp, 12);

    // ! expire time
    const otp_expires_at = new Date();

    otp_expires_at.setMinutes(otp_expires_at.getMinutes() + 5);

    // ! update otp
    otp_exists.verify_otp = hashed_otp;
    otp_exists.otp_expires_at = otp_expires_at;
    otp_exists.otp_last_sent_at = new Date();
    otp_exists.otp_sent_count = (otp_exists.otp_sent_count ?? 0) + 1;

    otp_exists.otp_verify_attempts = 0;

    otp_exists.request_ip = request_ip;
    otp_exists.request_device = request_device;

    await otp_exists.save();

    // ! send otp
    if (user_email) {
      console.log(`
        ========================================
        RESEND EMAIL OTP
        ========================================
        Email: ${user_email}
        OTP: ${plain_otp}
        ========================================
        `);
    }

    if (user_phone) {
      console.log(`
        ========================================
        RESEND PHONE OTP
        ========================================
        Phone: ${user_phone}
        OTP: ${plain_otp}
        ========================================
        `);
    }

    return true;
  },
};
