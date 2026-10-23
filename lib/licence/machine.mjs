// R9-LIC: the machine code of THIS computer.
// Source: Windows' installation ID (MachineGuid in the registry). It stays the
// same when RMS is reinstalled; a new computer or a reinstalled Windows gives a
// new machine code. Linux/macOS (development only): the system machine ID.
// Only a one-way hash of it is ever shown (lib/licence/format.mjs).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { hostname } from "node:os";
import { formatMachineCode, machineBytes } from "./format.mjs";

let cached = null;

function machineId() {
  try {
    if (process.platform === "win32") {
      const out = execFileSync(
        "reg",
        ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid", "/reg:64"],
        { encoding: "utf8", windowsHide: true, timeout: 5000 }
      );
      const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
      if (m) return m[1];
    } else if (process.platform === "darwin") {
      const out = execFileSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], { encoding: "utf8", timeout: 5000 });
      const m = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (m) return m[1];
    } else {
      for (const f of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
        try {
          const id = readFileSync(/*turbopackIgnore: true*/ f, "utf8").trim();
          if (id) return id;
        } catch {
          // try the next one
        }
      }
    }
  } catch (e) {
    console.error("[licence] could not read the machine ID:", e.message);
  }
  return `host:${hostname()}`; // last resort (development)
}

export function thisMachine() {
  if (!cached) {
    const bytes = machineBytes(machineId());
    cached = { bytes, code: formatMachineCode(bytes) };
  }
  return cached;
}
