import { user_role } from "../modules/auth/auth.interface";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        user_role: (typeof user_role)[keyof typeof user_role];
        user_email?: string;
        user_phone?: string;
      };
    }
  }
}
