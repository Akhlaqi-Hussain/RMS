// @/schemas/reportSchema.js
import { z } from "zod";

// Report schema
export const reportSchema = z
  .object({
    reportType: z.enum(["sales", "products", "financial", "orders"], {
      errorMap: () => ({ message: "نوع گزارش معتبر نیست" }),
    }),
    startDate: z
      .string()
      .min(1, "تاریخ شروع الزامی است")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ شروع باید به شکل YYYY-MM-DD باشد"),
    endDate: z
      .string()
      .min(1, "تاریخ پایان الزامی است")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ پایان باید به شکل YYYY-MM-DD باشد"),
    format: z.enum(["json", "csv", "xlsx"]).optional(),
    includeDetails: z.boolean().optional(),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "تاریخ پایان نباید قبل از تاریخ شروع باشد",
    path: ["endDate"],
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
    return { isValid: false, error: "خطای نامشخص" };
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
    return { isValid: false, errors: { general: "خطای نامشخص" } };
  }
};
