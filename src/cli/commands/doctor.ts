import { runDoctorChecks } from "../../core/doctor";
import type { DoctorCheck, DoctorStatus } from "../../core/types";
import { formatDoctorJson } from "../diagnosticOutput";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

export async function doctorCommand(
	options: { json?: unknown; checks?: DoctorCheck[] } = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const checks = options.checks ?? (await runDoctorChecks());
		if (json) {
			await writeCliOutput(formatDoctorJson(checks));
			if (checks.some((check) => check.status === "fail")) {
				process.exitCode = 1;
			}
			return;
		}

		console.log("picos doctor");
		console.log("");

		for (const check of checks) {
			console.log(
				`${statusLabel(check.status)} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`,
			);
		}
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) reportLocalInspectorJsonFailure("doctor", caught);
		throw caught;
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
