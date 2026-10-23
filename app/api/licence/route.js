import { NextResponse } from "next/server";
import { activateLicence, licenceStatus } from "@/lib/licence/state.mjs";

// R9-LIC: licence status and activation. Reachable without login (proxy.js),
// because on first start nobody can log in yet.
// Entering a code is safe for anyone: a code only works on this computer, only
// the owner can make one, and a code ending earlier than the current licence
// is refused (lib/licence/state.mjs).

const REASONS = {
  format: "Activation code not recognised",
  signature: "Activation code is not for this computer",
  expired: "Activation code has already expired",
  older: "Activation code ends earlier than the current licence",
};

function publicView(s) {
  return {
    enforced: s.enforced,
    state: s.state,
    blocked: s.blocked,
    readOnly: s.readOnly,
    machineCode: s.machineCode,
    licenceNo: s.licenceNo ?? null,
    issued: s.issued ?? null,
    expires: s.expires ?? null,
    daysLeft: s.daysLeft ?? null,
    warnDays: s.warnDays,
    contact: s.contact,
  };
}

export async function GET() {
  try {
    return NextResponse.json(publicView(await licenceStatus({ fresh: true })), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("Licence status error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.slice(0, 400) : "";
    if (!code.trim()) return NextResponse.json({ error: REASONS.format }, { status: 400 });
    const r = await activateLicence(code);
    if (!r.ok) return NextResponse.json({ error: REASONS[r.reason] || REASONS.format }, { status: 400 });
    return NextResponse.json({ success: true, ...publicView(r.status) });
  } catch (e) {
    console.error("Licence activation error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
