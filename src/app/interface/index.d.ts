import { user_role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user: {
        _id: string;
        user_role: user_role;
      };
    }
  }
}
