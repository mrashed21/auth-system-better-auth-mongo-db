import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { env_config } from "../config/env-config";
import api_error from "../helper/api-error";
import { user_role } from "../modules/auth/auth.interface";
import { user as user_model } from "../modules/auth/auth.model";
import { cookie_utils } from "../utils/cookie";
import { IJwtPayload, jwt_token } from "../utils/jwt";

export const check_auth =
  (...authRoles: (typeof user_role)[keyof typeof user_role][]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bearerToken = req.header("authorization")?.startsWith("Bearer ")
        ? req.header("authorization")?.slice(7)
        : undefined;
      const access_token = bearerToken || cookie_utils.get(req, "access_token");

      if (!access_token) {
        throw new api_error(
          status.UNAUTHORIZED,
          "Unauthorized access! No access token provided.",
        );
      }

      const verifiedToken = jwt_token.verify.access<IJwtPayload>(
        access_token,
        env_config.ACCESS_TOKEN_SECRET,
      );

      if (!verifiedToken.success || !verifiedToken.data) {
        throw new api_error(
          status.UNAUTHORIZED,
          "Unauthorized access! Invalid access token.",
        );
      }

      const current_user = await user_model
        .findById(verifiedToken.data._id)
        .select(
          "user_role user_email user_phone user_status is_deleted password_changed_at",
        );

      if (!current_user) {
        throw new api_error(status.UNAUTHORIZED, "Unauthorized access!");
      }

      if (current_user.is_deleted || current_user.user_status !== "active") {
        throw new api_error(status.FORBIDDEN, "Account is not active.");
      }

      const tokenIssuedAt = verifiedToken.data.iat;
      if (
        current_user.password_changed_at &&
        tokenIssuedAt &&
        current_user.password_changed_at.getTime() > tokenIssuedAt * 1000
      ) {
        throw new api_error(
          status.UNAUTHORIZED,
          "Session is no longer valid. Please sign in again.",
        );
      }

      (req as any).user = {
        _id: verifiedToken.data._id,
        user_role: current_user.user_role,
        user_email: current_user.user_email,
        user_phone: current_user.user_phone,
      };

      const user = req.user;

      if (!user) {
        throw new api_error(
          status.UNAUTHORIZED,
          "Unauthorized access! User context missing.",
        );
      }

      if (authRoles.length > 0 && !authRoles.includes(user.user_role)) {
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
