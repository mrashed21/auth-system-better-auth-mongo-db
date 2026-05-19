import dotenv from "dotenv";
import "dotenv/config";

dotenv.config();

export const env_config = {
  PORT: process.env.PORT || 5005,
  NODE_ENV: process.env.NODE_ENV || "development",

  DATABASE_URL: process.env.DATABASE_URL!,

  FRONTEND_URLS: [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3001",
  ],
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET!,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,

  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,

  EMAIL_SENDER_SMT_PASS: process.env.EMAIL_SENDER_SMT_PASS!,
  EMAIL_SENDER_SMTP_FROM: process.env.EMAIL_SENDER_SMTP_FROM!,
  EMAIL_SENDER_SMTP_HOST: process.env.EMAIL_SENDER_SMTP_HOST!,
  EMAIL_SENDER_SMTP_PORT: process.env.EMAIL_SENDER_SMTP_PORT!,
  EMAIL_SENDER_SMTP_USER: process.env.EMAIL_SENDER_SMTP_USER!,

  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,

  SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME || "Super Admin",
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || "admin@lms.local",
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || "12345678",
  SEED_ADMIN_CONTACT: process.env.SEED_ADMIN_CONTACT || null,
  SEED_ADMIN_ROLE: process.env.SEED_ADMIN_ROLE || "super_admin",
  SEED_ADMIN_PERMISSIONS:
    process.env.SEED_ADMIN_PERMISSIONS ||
    "admin_create,admin_update,admin_delete",
};
