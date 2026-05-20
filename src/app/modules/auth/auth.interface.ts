import { Types } from "mongoose";
export const user_role = {
  user: "user",
  admin: "admin",
} as const;

export const user_status = {
  active: "active",
  deactive: "deactive",
  banned: "banned",
  deleted: "deleted",
} as const;

export interface IUserModel {
  _id: Types.ObjectId;
  user_name: string;
  user_email: string;
  email_verified?: boolean;
  user_phone: string;
  phone_verified?: boolean;
  google_connected?: boolean;
  google_id?: string;
  user_password: string;
  verify_otp?: string;
  otp_expires_at?: Date;
  two_factor_enabled?: boolean;
  user_role: (typeof user_role)[keyof typeof user_role];
  user_area: string;
  user_city: string;
  user_country: string;
  user_profile_image: string;
  user_status: (typeof user_status)[keyof typeof user_status];
  is_deleted: boolean;
  deleted_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}
