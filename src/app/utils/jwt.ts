import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { user_role } from "../modules/auth/auth.interface";

export interface IJwtPayload extends JwtPayload {
  _id: string;
  user_role: (typeof user_role)[keyof typeof user_role];
  user_email?: string;
  user_phone?: string;
  user_email_verified?: boolean;
  user_phone_verified?: boolean;
}

export const jwt_token = {
  // ! create token
  create: (
    payload: IJwtPayload,
    secret: string,
    expiresIn: SignOptions["expiresIn"],
  ) => {
    return jwt.sign(payload, secret, {
      expiresIn,
    });
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

  // ! decode token
  decode: <T = JwtPayload>(token: string): T | null => {
    return jwt.decode(token) as T | null;
  },
};
