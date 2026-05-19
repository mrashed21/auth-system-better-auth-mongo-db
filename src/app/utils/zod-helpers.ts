import z from "zod";

export const zod_boolean_from_formdata = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === "boolean") return val;

    const normalized = val.toLowerCase().trim();

    if (normalized === "true") return true;
    if (normalized === "false") return false;

    throw new Error("Invalid boolean value");
  });
