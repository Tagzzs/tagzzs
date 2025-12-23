import { z } from "zod";

const tagNameSchema = z.string().max(50, "Cannot exceed more than 50 words");
const colorCodeSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color code format (must be hex color like #FF0000)");
const descriptionSchema = z.string().max(300, "Exceeding the limit of 300 words").optional();
const contentCountSchema = z.number().min(0, "Content count cannot be negative").optional();

// Main tag addition schema
export const addTagSchema = z.object({
  tagName: tagNameSchema,
  colorCode: colorCodeSchema,
  description: descriptionSchema,
  contentCount: contentCountSchema.default(0),
  userId: z.string().min(1, "User ID is required")
});

// Schema for tag updates
export const updateTagSchema = addTagSchema.partial().extend({
  updatedAt: z.string().optional()
});

// Schema for tag deletion and retrieval
export const tagIdSchema = z.object({
  tagId: z.string().min(1, "Tag ID is required"),
  userId: z.string().min(1, "User ID is required")
});

// Type exports for TypeScript
export type AddTagInput = z.infer<typeof addTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagIdInput = z.infer<typeof tagIdSchema>;
