import { z } from "zod";

const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;

export const staffSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "نام باید حداقل ۲ کاراکتر داشته باشد")
      .regex(nameRegex, "نام باید فقط شامل حروف فارسی یا انگلیسی باشد"),
    lastName: z
      .string()
      .min(2, "نام خانوادگی باید حداقل ۲ کاراکتر داشته باشد")
      .regex(
        nameRegex,
        "نام خانوادگی باید فقط شامل حروف فارسی یا انگلیسی باشد"
      ),
    role: z.string().nonempty("لطفا یک نقش انتخاب کنید"),
    phone: z
      .string()
      .regex(/^07[0-9]{8}$/, "شماره تلفن باید با 07 شروع شود و 10 رقم باشد"),
    username: z
      .string()
      .min(4, "نام کاربری باید حداقل ۴ کاراکتر داشته باشد")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و زیرخط باشد"
      ),
    password: z
      .string()
      .min(6, "رمز عبور باید حداقل ۶ کاراکتر داشته باشد")
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
      message: "رمز عبور و تکرار آن مطابقت ندارند",
      path: ["confirmPassword"],
    }
  );

export const staffEditSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "نام باید حداقل ۲ کاراکتر داشته باشد")
      .regex(nameRegex, "نام باید فقط شامل حروف فارسی یا انگلیسی باشد"),
    lastName: z
      .string()
      .min(2, "نام خانوادگی باید حداقل ۲ کاراکتر داشته باشد")
      .regex(
        nameRegex,
        "نام خانوادگی باید فقط شامل حروف فارسی یا انگلیسی باشد"
      ),
    role: z.string().nonempty("لطفا یک نقش انتخاب کنید"),
    phone: z
      .string()
      .regex(/^07[0-9]{8}$/, "شماره تلفن باید با 07 شروع شود و 10 رقم باشد"),
    username: z
      .string()
      .min(4, "نام کاربری باید حداقل ۴ کاراکتر داشته باشد")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و زیرخط باشد"
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
      message: "رمز عبور و تکرار آن مطابقت ندارند",
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
    return { isValid: false, error: "خطای نامشخص" };
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
    return { isValid: false, errors: { general: "خطای نامشخص" } };
  }
};
