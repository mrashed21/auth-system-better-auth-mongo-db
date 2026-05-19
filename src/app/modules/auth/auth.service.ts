import { user } from "./auth.model";

export const auth_service = {
  get_all_users: async () => {
    const users = await user.find();
    // const users = await user.find().select("-user_password");

    return users;
  },
};
