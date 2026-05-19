import { Schema, model } from "mongoose";
import { IUserModel } from "./auth.interface";

const user_model_schema = new Schema<IUserModel>({
  user_name: {
    type: String,
    required: true,
  },
  user_email: {
    type: String,
    required: true,
    unique: true,
  },
  user_phone: {
    type: String,
    required: true,
    unique: true,
  },
  user_password: {
    type: String,
    required: true,
  },
  user_role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  user_area: {
    type: String,
    required: true,
  },
  user_city: {
    type: String,
    required: true,
  },
  user_country: {
    type: String,
    required: true,
  },
  user_profile_image: {
    type: String,
  },
});

export const user = model<IUserModel>("user", user_model_schema);
