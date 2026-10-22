import { z } from "zod";

// I18N-01: error messages are translation keys; forms show them with t().

// Base schema (shared rules)
const baseMenuSchema = {
  name: z
    .string()
    .min(2, "validation.nameMin")
    .max(100, "validation.nameMax"),

  description: z
    .string()
    .min(5, "validation.descriptionMin")
    .max(500, "validation.descriptionMax"),

  category: z.coerce.number().min(1, "validation.categoryRequired"),

  price: z.coerce
    .number({ invalid_type_error: "validation.priceNumber" })
    .positive("validation.pricePositive")
    .max(1000000, "validation.priceMax"),

  image: z.any().refine(
    (file) => {
      if (!file) return false;
      if (typeof file === "string") return true; // existing image URL in edit mode
      return (
        file instanceof File &&
        ["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(
          file.type
        ) &&
        file.size <= 5 * 1024 * 1024 // max 5MB
      );
    },
    {
      message: "validation.imageInvalid",
    }
  ),
};

// Schema for adding a new menu item (image required)
export const menuSchema = z.object({
  ...baseMenuSchema,
  image: baseMenuSchema.image.refine((file) => file !== undefined, {
    message: "validation.imageRequired",
  }),
});

// Schema for editing an existing menu item (image optional)
export const menuEditSchema = z.object({
  ...baseMenuSchema,
  image: baseMenuSchema.image.optional(),
});

// Validate single field
export const validateField = (schema, fieldName, value) => {
  try {
    const fieldSchema = z.object({ [fieldName]: schema.shape[fieldName] });
    fieldSchema.parse({ [fieldName]: value });
    return { isValid: true, error: "" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldError = error.issues.find(
        (e) => Array.isArray(e.path) && e.path.includes(fieldName)
      );
      if (fieldError) return { isValid: false, error: fieldError.message };
    }
    return { isValid: false, error: "common.unknownError" };
  }
};

// Validate whole form
export const validateForm = (schema, formData) => {
  try {
    schema.parse(formData);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.issues.forEach((err) => {
        if (Array.isArray(err.path) && err.path.length > 0) {
          errors[err.path[0]] = err.message;
        } else {
          errors.general = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: "common.unknownError" } };
  }
};
