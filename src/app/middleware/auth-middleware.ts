import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { env_config } from "../config/env-config";
import api_error from "../helper/api-error";
import { user_role } from "../modules/auth/auth.interface";
import { cookie_utils } from "../utils/cookie";
import { jwt_token } from "../utils/jwt";

export const check_auth =
  (...authRoles: (typeof user_role)[keyof typeof user_role][]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("Auth middleware called for body:", req.body);
    try {
      const access_token = cookie_utils.get(req, "access_token");

      if (!access_token) {
        throw new api_error(
          status.UNAUTHORIZED,
          "Unauthorized access! No access token provided.",
        );
      }

      const verifiedToken = jwt_token.verify.access(
        access_token,
        env_config.ACCESS_TOKEN_SECRET,
      );

      if (!verifiedToken.success || !verifiedToken.data) {
        throw new api_error(
          status.UNAUTHORIZED,
          "Unauthorized access! Invalid access token.",
        );
      }

      (req as any).user = {
        _id: verifiedToken.data._id,
        user_role: verifiedToken.data.user_role,
        user_email: verifiedToken.data.user_email,
        user_phone: verifiedToken.data.user_phone,
      };

      const session_token = cookie_utils.get(req, "better-auth.session_token");

      // if (session_token) {
      //   // ! check session token in database mongodb and get user details
      //   const sessionExists = await db.session.findFirst({
      //     where: {
      //       token: session_token,
      //       expiresAt: {
      //         gt: new Date(),
      //       },
      //     },
      //     include: {
      //       user: true,
      //     },
      //   });

      //   if (sessionExists && sessionExists.user) {
      //     const user = sessionExists.user;

      //     if (
      //       user.user_status === user_status.deactive ||
      //       user.user_status === user_status.banned ||
      //       user.user_status === user_status.deleted ||
      //       user.is_deleted
      //     ) {
      //       throw new api_error(
      //         status.UNAUTHORIZED,
      //         "Unauthorized access! User is not active.",
      //       );
      //     }

      //     const now = new Date();
      //     const expiresAt = new Date(sessionExists.expiresAt);
      //     const createdAt = new Date(sessionExists.createdAt);

      //     const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
      //     const timeRemaining = expiresAt.getTime() - now.getTime();
      //     const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

      //     if (percentRemaining < 20) {
      //       res.setHeader("X-Session-Refresh", "true");
      //       res.setHeader("X-Session-Expires-At", expiresAt.toISOString());
      //       res.setHeader("X-Time-Remaining", timeRemaining.toString());
      //     }

      //     (req as any).user = {
      //       _id: user._id,
      //       user_role: user.user_role,
      //       user_email: user.user_email,
      //       user_phone: user.user_phone,
      //     };
      //   }
      // }

      if (
        authRoles.length > 0 &&
        !authRoles.includes(
          req.user.user_role as (typeof user_role)[keyof typeof user_role],
        )
      ) {
        throw new api_error(
          status.FORBIDDEN,
          "Forbidden access! You do not have permission.",
        );
      }

      next();
    } catch (error: any) {
      next(error);
    }
  };
