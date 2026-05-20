import { check_auth } from "@/app/middleware/auth-middleware";
import { Router } from "express";
import { auth_controller } from "./auth.controller";
import { user_role } from "./auth.interface";

const router: Router = Router();

router.route("/register").post(auth_controller.register);
router.route("/verify-otp").post(auth_controller.verify_otp);
router.route("/resend-otp").post(auth_controller.resend_otp);
router.route("/login").post(auth_controller.login);
router.route("/verify-login-2fa").post(auth_controller.verify_login_2fa);
router.route("/get-me").get(check_auth(user_role.user), auth_controller.get_me);

export const auth_router = router;
