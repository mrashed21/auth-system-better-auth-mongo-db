import { Schema, model } from "mongoose";
import { IUserModel } from "./auth.interface";

const phone_regex = /^(?:\+8801[3-9]\d{8}|01[3-9]\d{8})$/;

const user_model_schema = new Schema<IUserModel>(
  {
    user_name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name is too short"],
      maxlength: [100, "Name is too long"],
    },

    user_email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      default: undefined,
      validate: {
        validator: function (value: string) {
          if (!value) return true;

          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Invalid email address",
      },
    },
    email_verified: {
      type: Boolean,
      default: false,
    },

    user_phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
      validate: {
        validator: function (value: string) {
          if (!value) return true;

          return phone_regex.test(value);
        },
        message: "Invalid Bangladeshi phone number",
      },
    },

    phone_verified: {
      type: Boolean,
      default: false,
    },

    google_connected: {
      type: Boolean,
      default: false,
    },

    google_id: {
      type: String,
      default: null,
    },

    user_password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password is too short"],
      select: false,
    },

    two_factor_enabled: {
      type: Boolean,
      default: false,
    },
    two_factor_otp_method: {
      type: String,
      enum: ["email", "phone"],
      default: "email",
    },
    pending_two_factor_method: {
      type: String,
      enum: ["email", "phone"],
      default: null,
    },
    pending_email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      default: null,
    },
    pending_phone: {
      type: String,
      trim: true,
      sparse: true,
      default: null,
    },
    user_role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    user_area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    user_city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },

    user_country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },

    user_profile_image: {
      type: String,
      default: null,
    },

    user_status: {
      type: String,
      enum: ["active", "deactive", "banned", "deleted"],
      default: "active",
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },

    deleted_at: {
      type: Date,
      default: null,
    },
    password_changed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  },
);

// email or phone required
user_model_schema.pre("validate", async function () {
  const has_email = !!this.user_email?.trim();

  const has_phone = !!this.user_phone?.trim();

  if (!has_email && !has_phone) {
    throw new Error("Email or phone number is required");
  }
});

export const user = model<IUserModel>("user", user_model_schema);
