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
  user_phone: string;
  user_password: string;
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
