// jwt.ts

import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

export interface IJwtPayload extends JwtPayload {
  id: string;
  role: string;
  email_verified?: boolean;
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

  // ! verify token
  verify: <T extends JwtPayload>(
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
        message: error?.message || "Token verification failed",
        error,
      };
    }
  },

  // ! decode token
  decode: <T = JwtPayload>(token: string): T | null => {
    return jwt.decode(token) as T | null;
  },
};
