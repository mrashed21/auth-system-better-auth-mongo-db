import z from "zod";

const phone_regex = /^(?:\+8801[3-9]\d{8}|01[3-9]\d{8})$/;

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

    user_email: z
      .union([
        z.string().trim().toLowerCase().email({
          message: "Invalid email address",
        }),
        z.literal(""),
        z.undefined(),
      ])
      .optional(),

    user_phone: z
      .union([
        z.string().trim().regex(phone_regex, {
          message: "Invalid Bangladeshi phone number",
        }),
        z.literal(""),
        z.undefined(),
      ])
      .optional(),

    user_password: z
      .string({
        error: "Password is required",
      })
      .min(6, {
        message: "Password must be at least 6 characters",
      })
      .max(100, {
        message: "Password cannot exceed 100 characters",
      }),

    user_role: z
      .enum(["user", "admin"], {
        error: "Invalid user role",
      })
      .default("user"),

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
  });
