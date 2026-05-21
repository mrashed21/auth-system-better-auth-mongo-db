import { Schema, model } from "mongoose";
import { IOTPModel, otp_types } from "./otp.interface";

const phone_regex = /^(?:\+8801[3-9]\d{8}|01[3-9]\d{8})$/;

const otp_model_schema = new Schema<IOTPModel>(
  {
    otp_type: {
      type: String,
      enum: Object.values(otp_types),
      required: true,
    },

    user_email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      validate: {
        validator: function (value: string | null) {
          if (!value) return true;

          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Invalid email address",
      },
    },

    user_phone: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function (value: string | null) {
          if (!value) return true;

          return phone_regex.test(value);
        },
        message: "Invalid phone number",
      },
    },

    verify_otp: {
      type: String,
      default: null,
    },

    otp_expires_at: {
      type: Date,
      default: null,
    },

    otp_verify_attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    otp_verified: {
      type: Boolean,
      default: false,
    },

    otp_sent_count: {
      type: Number,
      default: 0,
      min: 0,
    },

    otp_last_sent_at: {
      type: Date,
      default: null,
    },

    otp_count_reset_at: {
      type: Date,
      default: null,
    },

    otp_blocked_until: {
      type: Date,
      default: null,
    },

    request_ip: {
      type: String,
      required: true,
      trim: true,
    },

    request_device: {
      type: {
        browser: String,
        os: String,
        device_type: String,
        device_vendor: String,
        device_model: String,
      },
      required: true,
    },
    user_agent: {
      type: String,
      required: true,
      trim: true,
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

// ! optional but recommended
otp_model_schema.index(
  {
    user_email: 1,
    otp_type: 1,
  },
  {
    partialFilterExpression: {
      user_email: { $exists: true },
    },
  },
);

otp_model_schema.index(
  {
    user_phone: 1,
    otp_type: 1,
  },
  {
    partialFilterExpression: {
      user_phone: { $exists: true },
    },
  },
);

export const otp = model<IOTPModel>("otp", otp_model_schema);
