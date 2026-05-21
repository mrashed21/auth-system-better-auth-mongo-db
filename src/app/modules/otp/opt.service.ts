import api_error from "@/app/helper/api-error";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
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

    const now = new Date();

    // ! FIND EXISTING OTP
    let otp_exists = await otp.findOne({
      otp_type,
      $or: [
        ...(user_email ? [{ user_email }] : []),
        ...(user_phone ? [{ user_phone }] : []),
      ],
    });

    // ! BLOCK CHECK
    if (otp_exists?.otp_blocked_until && otp_exists.otp_blocked_until > now) {
      const remaining_minutes = Math.ceil(
        (otp_exists.otp_blocked_until.getTime() - now.getTime()) / (1000 * 60),
      );

      throw new api_error(
        httpStatus.TOO_MANY_REQUESTS,
        `OTP request blocked. Try again after ${remaining_minutes} minutes`,
      );
    }

    // ! RESET COUNT AFTER 1 HOUR
    if (otp_exists?.otp_count_reset_at) {
      const one_hour_ms = 1000 * 60 * 60;

      const diff = now.getTime() - otp_exists.otp_count_reset_at.getTime();

      if (diff >= one_hour_ms) {
        otp_exists.otp_sent_count = 0;

        otp_exists.otp_count_reset_at = now;

        otp_exists.otp_blocked_until = null;
      }
    }

    // ! 2 MINUTE COOLDOWN

    if (otp_exists?.otp_last_sent_at) {
      const two_minutes_ms = 1000 * 60 * 2;
      //   const two_minutes_ms = 1000 * 1;

      const diff = now.getTime() - otp_exists.otp_last_sent_at.getTime();

      if (diff < two_minutes_ms) {
        const remaining_seconds = Math.ceil((two_minutes_ms - diff) / 1000);

        const minutes = Math.floor(remaining_seconds / 60);

        const seconds = remaining_seconds % 60;

        throw new api_error(
          httpStatus.TOO_MANY_REQUESTS,
          `Please wait ${minutes}m ${seconds}s before requesting another OTP`,
        );
      }
    }

    // ! MAX 5 OTP PER HOUR
    if ((otp_exists?.otp_sent_count ?? 0) >= 5) {
      const blocked_until = new Date();

      blocked_until.setMinutes(blocked_until.getMinutes() + 30);

      if (otp_exists) {
        otp_exists.otp_blocked_until = blocked_until;

        await otp_exists.save();
      }

      throw new api_error(
        httpStatus.TOO_MANY_REQUESTS,
        `Maximum OTP request limit exceeded. Blocked for ${blocked_until.getMinutes()} minutes`,
      );
    }

    // ! GENERATE OTP
    const plain_otp = generate_otp();

    const hashed_otp = await bcrypt.hash(plain_otp, 12);

    const otp_expires_at = new Date();

    otp_expires_at.setMinutes(otp_expires_at.getMinutes() + 5);

    // ! UPDATE EXISTING OTP
    if (otp_exists) {
      otp_exists.verify_otp = hashed_otp;
      otp_exists.otp_expires_at = otp_expires_at;
      otp_exists.otp_verified = false;
      otp_exists.otp_last_sent_at = now;
      otp_exists.otp_sent_count = (otp_exists.otp_sent_count ?? 0) + 1;
      otp_exists.otp_verify_attempts = 0;
      otp_exists.request_ip = request_ip;
      otp_exists.request_device = request_device;

      await otp_exists.save();
    }

    // ! CREATE OTP
    else {
      otp_exists = await otp.create({
        otp_type,
        user_email,
        user_phone,
        verify_otp: hashed_otp,
        otp_expires_at,
        otp_verified: false,
        otp_verify_attempts: 0,
        otp_sent_count: 1,
        otp_last_sent_at: now,
        otp_count_reset_at: now,
        request_ip,
        request_device,
      });
    }

    // ! SEND OTP

    if (user_email) {
      console.log(`
    ========================================
    EMAIL OTP SENT
    ========================================
    Email: ${user_email}
    OTP: ${plain_otp}
    Expire At: ${otp_expires_at.toLocaleString()}
    OTP Count: ${otp_exists.otp_sent_count}/5
    ========================================
    `);
    }

    if (user_phone) {
      console.log(`
    ========================================
    PHONE OTP SENT
    ========================================
    Phone: ${user_phone}
    OTP: ${plain_otp}
    Expire At: ${otp_expires_at.toLocaleString()}
    OTP Count: ${otp_exists.otp_sent_count}/5
    ========================================
    `);
    }

    return otp_exists;
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

    // ! otp not found
    if (!otp_exists) {
      throw new api_error(httpStatus.BAD_REQUEST, "OTP not found");
    }

    const now = new Date();

    // ! BLOCK CHECK
    if (otp_exists.otp_blocked_until && otp_exists.otp_blocked_until > now) {
      const remaining_minutes = Math.ceil(
        (otp_exists.otp_blocked_until.getTime() - now.getTime()) / (1000 * 60),
      );

      throw new api_error(
        httpStatus.TOO_MANY_REQUESTS,
        `OTP request blocked. Try again after ${remaining_minutes} minutes`,
      );
    }

    // ! RESET COUNT AFTER 1 HOUR
    if (!otp_exists.otp_count_reset_at) {
      otp_exists.otp_count_reset_at = now;
    }

    const one_hour_ms = 1000 * 60 * 60;

    const diff_from_reset =
      now.getTime() - otp_exists.otp_count_reset_at.getTime();

    // ! reset counter after 1 hour
    if (diff_from_reset >= one_hour_ms) {
      otp_exists.otp_sent_count = 0;

      otp_exists.otp_count_reset_at = now;

      otp_exists.otp_blocked_until = null;
    }

    // ! 2 MINUTE COOLDOWN
    if (otp_exists.otp_last_sent_at) {
      const two_minutes_ms = 1000 * 60 * 2;
      //   const two_minutes_ms = 1000 * 1;

      const cooldown_diff =
        now.getTime() - otp_exists.otp_last_sent_at.getTime();

      if (cooldown_diff < two_minutes_ms) {
        const remaining_seconds = Math.ceil(
          (two_minutes_ms - cooldown_diff) / 1000,
        );

        const minutes = Math.floor(remaining_seconds / 60);

        const seconds = remaining_seconds % 60;

        throw new api_error(
          httpStatus.TOO_MANY_REQUESTS,
          `Please wait ${minutes}m ${seconds}s before requesting another OTP`,
        );
      }
    }

    // ! MAX 5 OTP PER HOUR
    if ((otp_exists.otp_sent_count ?? 0) >= 5) {
      const blocked_until = new Date();

      // ! block for 30 minutes
      blocked_until.setMinutes(blocked_until.getMinutes() + 30);

      otp_exists.otp_blocked_until = blocked_until;

      await otp_exists.save();

      throw new api_error(
        httpStatus.TOO_MANY_REQUESTS,
        "Maximum OTP request limit exceeded. Blocked for 30 minutes",
      );
    }

    // ! GENERATE OTP
    const plain_otp = generate_otp();

    const hashed_otp = await bcrypt.hash(plain_otp, 12);

    const otp_expires_at = new Date();

    otp_expires_at.setMinutes(otp_expires_at.getMinutes() + 5);

    // ! UPDATE OTP
    otp_exists.verify_otp = hashed_otp;
    otp_exists.otp_expires_at = otp_expires_at;
    otp_exists.otp_last_sent_at = now;
    otp_exists.otp_sent_count = (otp_exists.otp_sent_count ?? 0) + 1;
    otp_exists.otp_verify_attempts = 0;
    otp_exists.request_ip = request_ip;
    otp_exists.request_device = request_device;
    otp_exists.otp_verified = false;

    await otp_exists.save();

    // ! SEND OTP

    if (user_email) {
      console.log(`
        ========================================
        RESEND EMAIL OTP
        ========================================
        Email: ${user_email}
        OTP: ${plain_otp}
        Expire At: ${otp_expires_at.toLocaleString()}
        OTP Count: ${otp_exists.otp_sent_count}/5
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
        Expire At: ${otp_expires_at.toLocaleString()}
        OTP Count: ${otp_exists.otp_sent_count}/5
        ========================================
        `);
    }

    return true;
  },
};
