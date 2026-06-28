import { runDoctorChecks } from "../../core/doctor";
import type { DoctorStatus } from "../../core/types";

export async function doctorCommand(): Promise<void> {
	const checks = await runDoctorChecks();

	console.log("picos doctor");
	console.log("");

	for (const check of checks) {
		console.log(
			`${statusLabel(check.status)} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`,
		);
	}
}

function statusLabel(status: DoctorStatus): string {
	if (status === "pass") {
		return "[OK]";
	}
	if (status === "warn") {
		return "[WARN]";
	}
	return "[FAIL]";
}
