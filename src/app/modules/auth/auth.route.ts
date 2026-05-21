import { check_auth } from "@/app/middleware/auth-middleware";
import { validate_request } from "@/app/middleware/validate-request";
import { Router } from "express";
import { auth_controller } from "./auth.controller";
import { user_role } from "./auth.interface";
import {
  change_contact_confirm_schema,
  change_contact_request_schema,
  change_password_request_schema,
  confirm_password_change_schema,
  enable_2fa_schema,
  forgot_password_schema,
  login_schema,
  refresh_token_schema,
  register_user_schema,
  resend_otp_schema,
  reset_password_schema,
  toggle_2fa_schema,
  verify_login_2fa_schema,
  verify_otp_schema,
} from "./auth.validation";

const router: Router = Router();

router
  .route("/register")
  .post(validate_request(register_user_schema), auth_controller.register);
router
  .route("/verify-otp")
  .post(validate_request(verify_otp_schema), auth_controller.verify_otp);
router
  .route("/resend-otp")
  .post(validate_request(resend_otp_schema), auth_controller.resend_otp);
router
  .route("/login")
  .post(validate_request(login_schema), auth_controller.login);
router
  .route("/refresh-token")
  .post(validate_request(refresh_token_schema), auth_controller.refresh_token);
router
  .route("/verify-login-2fa")
  .post(
    validate_request(verify_login_2fa_schema),
    auth_controller.verify_login_2fa,
  );
router
  .route("/forgot-password")
  .post(
    validate_request(forgot_password_schema),
    auth_controller.forgot_password,
  );
router
  .route("/reset-password")
  .post(
    validate_request(reset_password_schema),
    auth_controller.reset_password,
  );
router
  .route("/get-me")
  .get(check_auth(user_role.user, user_role.admin), auth_controller.get_me);
router
  .route("/logout")
  .post(check_auth(user_role.user, user_role.admin), auth_controller.logout);
router
  .route("/enable-2fa")
  .post(
    check_auth(user_role.user, user_role.admin),
    validate_request(enable_2fa_schema),
    auth_controller.enable_2fa,
  );
router
  .route("/toggle-2fa")
  .post(
    check_auth(user_role.user, user_role.admin),
    validate_request(toggle_2fa_schema),
    auth_controller.toggle_2fa,
  );
router
  .route("/change-password-request")
  .post(
    check_auth(user_role.user, user_role.admin),
    validate_request(change_password_request_schema),
    auth_controller.change_password_request,
  );
router
  .route("/confirm-password-change")
  .post(
    check_auth(user_role.user, user_role.admin),
    validate_request(confirm_password_change_schema),
    auth_controller.confirm_password_change,
  );
router
  .route("/change-contact-request")
  .post(
    check_auth(user_role.user, user_role.admin),
    validate_request(change_contact_request_schema),
    auth_controller.change_contact_request,
  );
router
  .route("/change-contact-confirm")
  .post(
    check_auth(user_role.user, user_role.admin),
    validate_request(change_contact_confirm_schema),
    auth_controller.change_contact_confirm,
  );

export const auth_router = router;
