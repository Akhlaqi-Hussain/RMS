import { z } from "zod";

// Login schema (messages are translation keys — shown with t())
export const loginSchema = z.object({
  username: z.string().min(4, "validation.usernameMin"),
  password: z.string().min(6, "validation.passwordMin"),
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
