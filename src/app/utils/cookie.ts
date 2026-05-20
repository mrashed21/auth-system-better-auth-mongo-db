// cookie.ts

import { CookieOptions, Request, Response } from "express";

export const cookie_utils = {
  // ! set cookie
  set: (res: Response, key: string, value: string, options: CookieOptions) => {
    res.cookie(key, value, options);
  },

  // ! get cookie
  get: (req: Request, key: string) => {
    return req.cookies[key];
  },

  // ! clear cookie
  clear: (res: Response, key: string, options?: CookieOptions) => {
    res.clearCookie(key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      ...options,
    });
  },
};
