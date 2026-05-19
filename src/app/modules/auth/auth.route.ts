import { Router } from "express";
import { auth_controller } from "./auth.controller";

const router: Router = Router();

router.route("/all-users").get(auth_controller.get_all_users);

export const auth_router = router;
