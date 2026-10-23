import { z } from "zod";
import { staffSchema, staffEditSchema } from "@/schemas/staffSchema";

// S1-VAL: the server checks staff details with the SAME rules as the staff
// form (schemas/staffSchema.jsx), so a request sent around the browser can't
// store invalid data. Only addition: the role must be one of the four roles.
export const STAFF_ROLES = ["manager", "cashier", "waiter", "chef"];
export const INVALID_STAFF_DATA = "برخی معلومات کارمند درست نیست";

// The form's own fields, without the browser-only "confirm password" field.
const formFields = (shape) =>
  Object.fromEntries(Object.entries(shape).filter(([k]) => k !== "confirmPassword"));

const role = z.enum(STAFF_ROLES);

// New staff member: same as the form, and a password is required.
const newStaffSchema = z.object({
  ...formFields(staffSchema.shape),
  role,
  password: z.string().min(6),
});

// Editing: same as the edit form (password optional; empty = unchanged).
const staffUpdateSchema = z.object({
  ...formFields(staffEditSchema.shape),
  role,
});

export const isValidNewStaff = (body) => newStaffSchema.safeParse(body ?? {}).success;
export const isValidStaffUpdate = (body) => staffUpdateSchema.safeParse(body ?? {}).success;

// S1-MGR: RMS must always keep at least one active manager (otherwise nobody
// could open Manage any more). Locks the active managers' rows until the
// transaction ends, so two managers acting at the same moment can't both pass.
export const LAST_MANAGER = "حداقل یک مدیر فعال باید باقی بماند";
export const CANNOT_DEACTIVATE_SELF = "شما نمی‌توانید حساب خود را غیرفعال کنید";

export async function lockActiveManagerIds(conn) {
  const [rows] = await conn.query(
    "SELECT staff_id FROM staff WHERE role = 'manager' AND is_active = 1 FOR UPDATE"
  );
  return rows.map((r) => Number(r.staff_id));
}

// true when this change would leave no active manager
export function removesLastManager(activeManagerIds, staffId) {
  return activeManagerIds.length <= 1 && activeManagerIds.includes(Number(staffId));
}
