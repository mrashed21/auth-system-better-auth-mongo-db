import z from "zod";

const phone_regex = /^(?:\+8801[3-9]\d{8}|01[3-9]\d{8})$/;
const otp_regex = /^\d{6}$/;

const email_field = z
  .union([
    z.string().trim().toLowerCase().email({
      message: "Invalid email address",
    }),
    z.literal(""),
    z.undefined(),
  ])
  .optional()
  .transform((value) => value || undefined);

const phone_field = z
  .union([
    z.string().trim().regex(phone_regex, {
      message: "Invalid Bangladeshi phone number",
    }),
    z.literal(""),
    z.undefined(),
  ])
  .optional()
  .transform((value) => value || undefined);

const verify_otp_field = z
  .string({
    error: "OTP is required",
  })
  .trim()
  .regex(otp_regex, {
    message: "OTP must be a 6 digit code",
  });

const password_field = z
  .string({
    error: "Password is required",
  })
  .min(8, {
    message: "Password must be at least 8 characters",
  })
  .max(100, {
    message: "Password cannot exceed 100 characters",
  });

const contact_rule = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).superRefine((data: any, ctx) => {
    const has_email = !!data.user_email && data.user_email.trim() !== "";
    const has_phone = !!data.user_phone && data.user_phone.trim() !== "";

    if (!has_email && !has_phone) {
      ctx.addIssue({
        code: "custom",
        path: ["user_email"],
        message: "Email or phone number is required",
      });

      ctx.addIssue({
        code: "custom",
        path: ["user_phone"],
        message: "Email or phone number is required",
      });
    }

    if (has_email && has_phone) {
      ctx.addIssue({
        code: "custom",
        path: ["user_email"],
        message: "Provide either email or phone number, not both",
      });

      ctx.addIssue({
        code: "custom",
        path: ["user_phone"],
        message: "Provide either email or phone number, not both",
      });
    }
  });

export const register_user_schema = z
  .object({
    user_name: z
      .string({
        error: "Name is required",
      })
      .trim()
      .min(2, {
        message: "Name must be at least 2 characters",
      })
      .max(100, {
        message: "Name cannot exceed 100 characters",
      }),

    user_email: email_field,

    user_phone: phone_field,

    user_password: password_field,

    user_role: z.literal("user").default("user"),

    user_area: z
      .string({
        error: "Area is required",
      })
      .trim()
      .min(2, {
        message: "Area must be at least 2 characters",
      }),

    user_city: z
      .string({
        error: "City is required",
      })
      .trim()
      .min(2, {
        message: "City must be at least 2 characters",
      }),

    user_country: z
      .string({
        error: "Country is required",
      })
      .trim()
      .min(2, {
        message: "Country must be at least 2 characters",
      }),

    user_profile_image: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    const has_email = !!data.user_email && data.user_email.trim() !== "";
    const has_phone = !!data.user_phone && data.user_phone.trim() !== "";

    if (!has_email && !has_phone) {
      ctx.addIssue({
        code: "custom",
        path: ["user_email"],
        message: "Email or phone number is required",
      });

      ctx.addIssue({
        code: "custom",
        path: ["user_phone"],
        message: "Email or phone number is required",
      });
    }

    if (has_email && has_phone) {
      ctx.addIssue({
        code: "custom",
        path: ["user_email"],
        message: "Provide either email or phone number, not both",
      });

      ctx.addIssue({
        code: "custom",
        path: ["user_phone"],
        message: "Provide either email or phone number, not both",
      });
    }
  });

export const contact_identifier_schema = contact_rule({
  user_email: email_field,
  user_phone: phone_field,
});

export const login_schema = contact_rule({
  user_email: email_field,
  user_phone: phone_field,
  user_password: password_field,
});

export const verify_otp_schema = contact_rule({
  user_email: email_field,
  user_phone: phone_field,
  verify_otp: verify_otp_field,
});

export const resend_otp_schema = contact_rule({
  user_email: email_field,
  user_phone: phone_field,
});

export const verify_login_2fa_schema = contact_rule({
  user_email: email_field,
  user_phone: phone_field,
  verify_otp: verify_otp_field,
});

export const refresh_token_schema = z.object({
  refresh_token: z.string().trim().min(1).optional(),
});

export const enable_2fa_schema = z.object({
  two_factor_otp_method: z.enum(["email", "phone"], {
    error: "Invalid two-factor method",
  }),
});

export const toggle_2fa_schema = z
  .object({
    enabled: z.boolean({
      error: "enabled must be a boolean",
    }),
    verify_otp: z
      .string()
      .trim()
      .regex(otp_regex, {
        message: "OTP must be a 6 digit code",
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.enabled && !data.verify_otp) {
      ctx.addIssue({
        code: "custom",
        path: ["verify_otp"],
        message: "OTP is required to enable two-factor authentication",
      });
    }
  });

export const change_password_request_schema = z.object({
  current_password: password_field,
});

export const confirm_password_change_schema = z.object({
  new_password: password_field,
  verify_otp: verify_otp_field.optional(),
});

export const forgot_password_schema = contact_identifier_schema;

export const reset_password_schema = contact_rule({
  user_email: email_field,
  user_phone: phone_field,
  verify_otp: verify_otp_field,
  new_password: password_field,
});

export const change_contact_request_schema = z
  .object({
    new_email: email_field,
    new_phone: phone_field,
  })
  .superRefine((data: any, ctx) => {
    const has_email = !!data.new_email && data.new_email.trim() !== "";
    const has_phone = !!data.new_phone && data.new_phone.trim() !== "";

    if (!has_email && !has_phone) {
      ctx.addIssue({
        code: "custom",
        path: ["new_email"],
        message: "New email or phone number is required",
      });

      ctx.addIssue({
        code: "custom",
        path: ["new_phone"],
        message: "New email or phone number is required",
      });
    }

    if (has_email && has_phone) {
      ctx.addIssue({
        code: "custom",
        path: ["new_email"],
        message: "Provide either a new email or a new phone number, not both",
      });

      ctx.addIssue({
        code: "custom",
        path: ["new_phone"],
        message: "Provide either a new email or a new phone number, not both",
      });
    }
  });

export const change_contact_confirm_schema = z.object({
  verify_otp: verify_otp_field,
});
