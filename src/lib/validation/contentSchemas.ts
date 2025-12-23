import { z } from "zod";

// Helper function to count words
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const linkSchema = z.string().url("Please enter a valid URL");
const titleSchema = z
  .string()
  .max(200, "Title cannot exceed 200 characters")
  .refine((val) => countWords(val) <= 50, "Title cannot exceed 50 words");
const contentTypeSchema = z
  .string()
  .max(100, "Content type cannot exceed 100 characters");
const descriptionSchema = z
  .string()
  .max(5000, "Description cannot exceed 5000 characters")
  .refine((val) => countWords(val) <= 500, "Description cannot exceed 500 words");
const personalNotesSchema = z
  .string()
  .max(1000, "Personal notes cannot exceed 1000 characters")
  .refine((val) => val === "" || countWords(val) <= 150, "Personal notes cannot exceed 150 words")
  .optional();
const readTimeSchema = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
  .optional();
const tagsIdSchema = z.array(z.string()).optional().default([]);
const thumbnailUrlSchema = z
  .string()
  .refine(
    (val) => val === "" || val.trim() === "" || z.string().url().safeParse(val).success,
    'Invalid thumbnail URL format'
  )
  .nullable()
  .optional();
const rawContentSchema = z.string().optional(); 

// Main content addition schema
export const addContentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  link: linkSchema,
  title: titleSchema,
  contentType: contentTypeSchema.optional(),
  description: descriptionSchema.optional(),
  personalNotes: personalNotesSchema,
  readTime: readTimeSchema,
  tagsId: tagsIdSchema,
  thumbnailUrl: thumbnailUrlSchema,
  rawContent: rawContentSchema,
});

// Schema for content updates
export const updateContentSchema = addContentSchema.partial().extend({
  updatedAt: z.string().optional(),
});

// Schema for content deletion and retrieval
export const contentIdSchema = z.object({
  contentId: z.string().min(1, "Content ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

// Type exports for TypeScript
export type AddContentInput = z.infer<typeof addContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type ContentIdInput = z.infer<typeof contentIdSchema>;
