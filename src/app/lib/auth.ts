import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import nodemailer from "nodemailer";
import { db } from "./mongodb";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.APP_USER,
    pass: process.env.APP_PASS,
  },
});
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  database: mongodbAdapter(db),
  trustedOrigins: [process.env.APP_URL!],
  experimental: { joins: true },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },

      user_type: {
        type: "string",
        required: false,
        defaultValue: "requester",
      },

      status: {
        type: "string",
        defaultValue: "active",
      },
      profile_completed: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      try {
        const verifyURL = `${process.env.APP_URL}/auth/verify-email?token=${token}`;
        const info = await transporter.sendMail({
          from: '"Donation App" <donation@app.com>',
          to: user.email,
          // to: "islamrohi99@gmail.com",
          subject: "Blood Donation App: verify your email address",
          // text: "Hello world?",
          html: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f5f7fb;
        font-family: Arial, Helvetica, sans-serif;
        color: #333333;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .header {
        background-color: #c0392b;
        padding: 20px;
        text-align: center;
        color: #ffffff;
      }
      .content {
        padding: 30px;
        line-height: 1.6;
      }
      .button {
        display: inline-block;
        margin: 24px 0;
        padding: 14px 24px;
        background-color: #c0392b;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
      }
      .footer {
        padding: 20px;
        font-size: 13px;
        color: #777777;
        background-color: #f5f7fb;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Verify Your Email Address</h2>
      </div>

      <div class="content">
        <p>Hi <strong>${user.name}</strong>,</p>

        <p>
          Thank you for joining <strong>Blood Donation App</strong>.
          Your registration helps connect blood donors with people in urgent need.
        </p>

        <p>
          To activate your account and keep our community safe and trustworthy,
          please verify your email address by clicking the button below.
        </p>

        <p style="text-align: center;">
          <a href="${verifyURL}" class="button">Verify Email Address</a>
        </p>

        <p>
          If the button does not work, please copy and paste the following link into your browser:
        </p>

        <p style="word-break: break-all;">
          <a href="${verifyURL}">${verifyURL}</a>
        </p>

        <p>
          For security reasons, this verification link will expire.
          If you did not create an account on Blood Donation App, you can safely ignore this email.
        </p>

        <p>
          Together, we can save lives.<br />
          <strong>Blood Donation App Team</strong>
        </p>
      </div>

      <div class="footer">
        <p>
          © ${new Date().getFullYear()} Blood Donation App. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>

`,
        });
      } catch (error) {
        throw new Error("Something went wrong");
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
});
