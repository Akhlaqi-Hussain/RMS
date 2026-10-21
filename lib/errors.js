// SEC-7: decide which error text may be shown to the user.
//
// The stored procedures raise their own friendly Persian messages with
// SQLSTATE '45000' (e.g. "مقدار تخفیف نامعتبر است"). Those are written for
// users and are safe to show. Every other error (connection problems, SQL
// errors, programming errors) can reveal internal details, so the user only
// gets a general message; the full error still goes to the server log.

export function isBusinessRuleError(err) {
  return err?.sqlState === "45000";
}

export function publicErrorMessage(err, fallback = "خطای سرور رخ داد. لطفاً دوباره تلاش کنید") {
  return isBusinessRuleError(err) ? err.message : fallback;
}

// HTTP status to use for an error: 400 for a broken business rule, 500 otherwise.
export function errorStatus(err) {
  return isBusinessRuleError(err) ? 400 : 500;
}
