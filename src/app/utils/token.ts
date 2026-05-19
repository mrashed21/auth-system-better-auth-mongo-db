import { Response } from "express";
import { env_config } from "../config/env-config";
import { cookie_utils } from "./cookie";
import { IJwtPayload, jwt_token } from "./jwt";

export const token_utils = {
  //  ! create token
  create: {
    access: (payload: IJwtPayload) => {
      return jwt_token.create.access(
        payload,
        env_config.ACCESS_TOKEN_SECRET,
        "1d",
      );
    },

    refresh: (payload: IJwtPayload) => {
      return jwt_token.create.refresh(
        payload,
        env_config.REFRESH_TOKEN_SECRET,
        "7d",
      );
    },
  },

  // ! set cookie
  set_cookie: {
    access: (res: Response, token: string) => {
      cookie_utils.set(res, "access_token", token, {
        httpOnly: true,
        secure: env_config.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      });
    },

    refresh: (res: Response, token: string) => {
      cookie_utils.set(res, "refresh_token", token, {
        httpOnly: true,
        secure: env_config.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
    },

    betterAuth: (res: Response, token: string) => {
      cookie_utils.set(res, "better-auth.session_token", token, {
        httpOnly: true,
        secure: env_config.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24,
      });
    },
  },
};
