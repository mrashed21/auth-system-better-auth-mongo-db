import { user_role, user_status } from "@/generated/enums";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
// import { user_role, user_status } from "../../generated/prisma/enums";

export interface IJwtPayload extends JwtPayload {
  id: string;
  user_email: string;
  user_name: string;
  user_role: user_role;
  is_deleted: boolean;
  user_status: user_status;
  email_verified: boolean;
}

export const jwt_token = {
  // ! create token
  create: {
    access: (
      payload: IJwtPayload,
      secret: string,
      expiresIn: SignOptions["expiresIn"] = "1d",
    ) => {
      return jwt.sign(payload, secret, { expiresIn });
    },

    refresh: (
      payload: IJwtPayload,
      secret: string,
      expiresIn: SignOptions["expiresIn"] = "7d",
    ) => {
      return jwt.sign(payload, secret, { expiresIn });
    },
  },

  // !  verify token
  verify: {
    access: <T extends JwtPayload>(
      token: string,
      secret: string,
    ): {
      success: boolean;
      data?: T;
      message?: string;
      error?: unknown;
    } => {
      try {
        const decoded = jwt.verify(token, secret) as T;

        return {
          success: true,
          data: decoded,
        };
      } catch (error: any) {
        return {
          success: false,
          message: error.message,
          error,
        };
      }
    },

    refresh: <T extends JwtPayload>(
      token: string,
      secret: string,
    ): {
      success: boolean;
      data?: T;
      message?: string;
      error?: unknown;
    } => {
      try {
        const decoded = jwt.verify(token, secret) as T;

        return {
          success: true,
          data: decoded,
        };
      } catch (error: any) {
        return {
          success: false,
          message: error.message,
          error,
        };
      }
    },
  },

  // !  decode token
  decode: <T = JwtPayload>(token: string): T | null => {
    return jwt.decode(token) as T | null;
  },
};
