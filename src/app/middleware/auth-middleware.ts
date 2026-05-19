import { NextFunction, Request, Response } from "express";

import status from "http-status";

import api_error from "../helper/api-error";

import { env_config } from "../config/env-config";

import { cookie_utils } from "../utils/cookie";

import { jwt_token } from "../utils/jwt";

import { db } from "../lib/mongodb";
import { user_status } from "../modules/auth/auth.interface";

export const check_auth =
  (...authRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      /*
       |--------------------------------------------------------------------------
       | ACCESS TOKEN
       |--------------------------------------------------------------------------
       */

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

      req.user = {
        id: verifiedToken.data.id,

        user_role: verifiedToken.data.user_role,

        user_email: verifiedToken.data.user_email,
      };

      /*
       |--------------------------------------------------------------------------
       | BETTER AUTH SESSION
       |--------------------------------------------------------------------------
       */

      const session_token = cookie_utils.get(req, "better-auth.session_token");

      if (session_token) {
        const sessionCollection = db.collection("session");

        const userCollection = db.collection("user");

        const sessionExists = await sessionCollection.findOne({
          token: session_token,

          expiresAt: {
            $gt: new Date(),
          },
        });

        if (sessionExists) {
          const user = await userCollection.findOne({
            _id: sessionExists.userId,
          });

          if (!user) {
            throw new api_error(
              status.UNAUTHORIZED,
              "Unauthorized access! User not found.",
            );
          }

          /*
           |--------------------------------------------------------------------------
           | USER STATUS CHECK
           |--------------------------------------------------------------------------
           */

          if (
            user.user_status === user_status.deactive ||
            user.user_status === user_status.banned ||
            user.user_status === user_status.deleted ||
            user.is_deleted
          ) {
            throw new api_error(
              status.UNAUTHORIZED,
              "Unauthorized access! User is not active.",
            );
          }

          /*
           |--------------------------------------------------------------------------
           | SESSION REFRESH WARNING
           |--------------------------------------------------------------------------
           */

          const now = new Date();

          const expiresAt = new Date(sessionExists.expiresAt);

          const createdAt = new Date(sessionExists.createdAt);

          const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();

          const timeRemaining = expiresAt.getTime() - now.getTime();

          const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

          if (percentRemaining < 20) {
            res.setHeader("X-Session-Refresh", "true");

            res.setHeader("X-Session-Expires-At", expiresAt.toISOString());

            res.setHeader("X-Time-Remaining", timeRemaining.toString());
          }

          /*
           |--------------------------------------------------------------------------
           | SET USER
           |--------------------------------------------------------------------------
           */

          req.user = {
            id: user._id.toString(),

            user_role: user.user_role,

            user_email: user.user_email,
          };
        }
      }

      /*
       |--------------------------------------------------------------------------
       | ROLE CHECK
       |--------------------------------------------------------------------------
       */

      if (authRoles.length > 0 && !authRoles.includes(req.user.user_role)) {
        throw new api_error(
          status.FORBIDDEN,
          "Forbidden access! You do not have permission.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
