import { Types } from "mongoose";

export const otp_types = {
  email_verify: "email_verify",
  phone_verify: "phone_verify",
  forgot_password: "forgot_password",
  change_email: "change_email",
  change_phone: "change_phone",
  admin_2fa: "admin_2fa",
  login_2fa: "login_2fa",
} as const;

export interface IOTPModel {
  _id: Types.ObjectId;
  otp_type: (typeof otp_types)[keyof typeof otp_types];
  user_email?: string | null;
  user_phone?: string | null;
  verify_otp?: string | null;
  otp_expires_at?: Date | null;
  otp_verify_attempts?: number;
  otp_verified: boolean;
  otp_sent_count?: number;
  otp_last_sent_at?: Date | null;
  otp_count_reset_at?: Date | null;
  otp_blocked_until?: Date | null;
  request_ip: string;
  request_device: string;
  created_at?: Date;
  updated_at?: Date;
}
