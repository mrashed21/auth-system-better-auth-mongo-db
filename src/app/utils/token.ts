// token.ts

import { Response } from "express";

import { env_config } from "../config/env-config";

import { cookie_utils } from "./cookie";
import { IJwtPayload, jwt_token } from "./jwt";

const cookie_options = {
  httpOnly: true,
  secure: env_config.NODE_ENV === "production",

  sameSite:
    env_config.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),

  path: "/",
};

export const token_utils = {
  // ! create token
  create: {
    access: (payload: IJwtPayload) => {
      return jwt_token.create(payload, env_config.ACCESS_TOKEN_SECRET, "1d");
    },

    refresh: (payload: IJwtPayload) => {
      return jwt_token.create(payload, env_config.REFRESH_TOKEN_SECRET, "7d");
    },
  },

  // ! verify token
  verify: {
    access: <T extends IJwtPayload>(token: string) => {
      return jwt_token.verify<T>(token, env_config.ACCESS_TOKEN_SECRET);
    },

    refresh: <T extends IJwtPayload>(token: string) => {
      return jwt_token.verify<T>(token, env_config.REFRESH_TOKEN_SECRET);
    },
  },

  // ! set refresh cookie only
  set_cookie: {
    refresh: (res: Response, token: string) => {
      cookie_utils.set(res, "refresh_token", token, {
        ...cookie_options,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
    },
  },

  // ! clear cookies
  clear_cookie: {
    refresh: (res: Response) => {
      cookie_utils.clear(res, "refresh_token");
    },
  },
};
