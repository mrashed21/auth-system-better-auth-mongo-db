import { Router } from "express";
import { auth_controller } from "./auth.controller";

const router: Router = Router();

router.route("/register").post(auth_controller.register);
router.route("/verify-otp").post(auth_controller.verify_otp);
router.route("/resend-otp").post(auth_controller.resend_otp);
router.route("/login").post(auth_controller.login);
router.route("/verify-login-2fa").post(auth_controller.verify_login_2fa);

export const auth_router = router;
