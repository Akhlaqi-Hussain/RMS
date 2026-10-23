import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { withTransaction } from "@/lib/transaction";
import { lockActiveManagerIds, isValidNewStaff } from "@/lib/staffRules";
import { firstRunNeeded, forgetFirstRunState, removeSetupCode, setupCodeMatches } from "@/lib/firstRun.mjs";
import { pausedFor, recordFailure, recordSuccess } from "@/lib/loginThrottle";

// R9-SETUP: create the FIRST manager of a new RMS.
// Works only while the database has no active manager, and only with the
// one-time setup code from the RMS computer (lib/firstRun.mjs).
// Same rules as `npm run create-manager`: names/phone/username like Manage →
// Staff, and a stronger password (at least 10 characters, letters and digits).

const MSG = {
  done: "Setup already completed",
  code: "Setup code is not correct",
  data: "برخی معلومات کارمند درست نیست", // same text as S1-VAL (translated on screen)
  password: "Password must have at least 10 characters with letters and digits",
  paused: "تلاش‌های ناموفق زیاد است. لطفاً ۱۵ دقیقه بعد دوباره تلاش کنید", // same as S1-LOGIN
};
const THROTTLE_KEY = "__first-run-setup__";

export async function GET() {
  return NextResponse.json({ needed: await firstRunNeeded({ fresh: true }) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  try {
    if (!(await firstRunNeeded({ fresh: true }))) {
      return NextResponse.json({ error: MSG.done }, { status: 409 });
    }
    const waitMs = pausedFor(THROTTLE_KEY);
    if (waitMs > 0) {
      return NextResponse.json({ error: MSG.paused }, { status: 429, headers: { "Retry-After": String(Math.ceil(waitMs / 1000)) } });
    }
    const body = await req.json().catch(() => ({}));
    if (!setupCodeMatches(body.code)) {
      recordFailure(THROTTLE_KEY);
      return NextResponse.json({ error: MSG.code }, { status: 403 });
    }
    const { firstName, lastName, username, phone, password } = body;
    if (!isValidNewStaff({ firstName, lastName, username, phone, password, role: "manager" })) {
      return NextResponse.json({ error: MSG.data }, { status: 400 });
    }
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: MSG.password }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const created = await withTransaction(async (conn) => {
      // locks the active managers' rows: two people finishing setup at the same moment can't both succeed
      if ((await lockActiveManagerIds(conn)).length > 0) return false;
      await conn.query("CALL add_staff(?, ?, ?, ?, ?, ?)", [firstName, lastName, username, hash, "manager", phone]);
      return true;
    });
    if (!created) return NextResponse.json({ error: MSG.done }, { status: 409 });

    recordSuccess(THROTTLE_KEY);
    removeSetupCode();
    forgetFirstRunState();
    console.log(`[setup] First manager "${username}" created.`);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e?.sqlState === "45000") {
      return NextResponse.json({ error: e.message }, { status: 400 }); // e.g. username already used
    }
    console.error("First-run setup error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
