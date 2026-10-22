import { z } from "zod";

// I18N-01: error messages are translation keys; forms show them with t().

const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;

export const staffSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "validation.firstNameMin")
      .regex(nameRegex, "validation.firstNameLetters"),
    lastName: z
      .string()
      .min(2, "validation.lastNameMin")
      .regex(
        nameRegex,
        "validation.lastNameLetters"
      ),
    role: z.string().nonempty("validation.roleRequired"),
    phone: z
      .string()
      .regex(/^07[0-9]{8}$/, "validation.phoneFormat"),
    username: z
      .string()
      .min(4, "validation.usernameMin")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "validation.usernameChars"
      ),
    password: z
      .string()
      .min(6, "validation.passwordMin")
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "validation.passwordMismatch",
      path: ["confirmPassword"],
    }
  );

export const staffEditSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "validation.firstNameMin")
      .regex(nameRegex, "validation.firstNameLetters"),
    lastName: z
      .string()
      .min(2, "validation.lastNameMin")
      .regex(
        nameRegex,
        "validation.lastNameLetters"
      ),
    role: z.string().nonempty("validation.roleRequired"),
    phone: z
      .string()
      .regex(/^07[0-9]{8}$/, "validation.phoneFormat"),
    username: z
      .string()
      .min(4, "validation.usernameMin")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "validation.usernameChars"
      ),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "validation.passwordMismatch",
      path: ["confirmPassword"],
    }
  );

export const validateField = (schema, fieldName, value, allData = {}) => {
  try {
    const fieldSchema = z.object({ [fieldName]: schema.shape[fieldName] });
    fieldSchema.parse({ [fieldName]: value });
    return { isValid: true, error: "" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Only check errors that have a path
      const fieldError = error.issues.find(
        (e) => Array.isArray(e.path) && e.path.includes(fieldName)
      );
      if (fieldError) return { isValid: false, error: fieldError.message };
    }
    return { isValid: false, error: "common.unknownError" };
  }
};

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
          // fallback for errors without a path
          errors.general = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: "common.unknownError" } };
  }
};
