import { NextFunction, Request, Response } from "express";
import status from "http-status";

import { env_config } from "../config/env-config";
import api_error from "../helper/api-error";
import { db } from "../lib/mongodb";
import { user_status } from "../modules/auth/auth.interface";
import { cookie_utils } from "../utils/cookie";
import { jwt_token } from "../utils/jwt";

export const check_auth =
  (...authRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("Auth middleware called for path:", req);
    try {
      /*
       |--------------------------------------------------------------------------
       | ACCESS TOKEN
       |--------------------------------------------------------------------------
       */

      const authorization = req.headers.authorization;

      if (!authorization || !authorization.startsWith("Bearer ")) {
        throw new api_error(
          status.UNAUTHORIZED,
          "Unauthorized access! No access token provided.",
        );
      }

      const access_token = authorization.split(" ")[1];

      const verifiedToken = jwt_token.verify(
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
        _id: verifiedToken.data._id,

        user_role: verifiedToken.data.role,
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
            _id: user._id.toString(),

            user_role: user.user_role,
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
