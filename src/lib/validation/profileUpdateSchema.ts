import { z } from "zod";

export interface ProfileUpdateError {
  field: string;
  message: string;
}

export function formatValidationErrors(
  error: z.ZodError
): ProfileUpdateError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export const profileUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name can't be empty")
      .max(255, "Name is too long")
      .optional(),

    avatar_url: z.string().url("Invalid avatar URL").nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
