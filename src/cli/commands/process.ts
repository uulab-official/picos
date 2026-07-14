import {
	formatProcessDetail,
	formatProcessFileSnapshot,
	getProcessDetail,
	getProcessDetailWithSource,
	getProcessFileSnapshot,
	getProcessFileSnapshotWithSource,
	type ProcessDetail,
	type ProcessDetailResult,
	type ProcessFileSnapshot,
	type ProcessFileSnapshotResult,
	validateProcessId,
} from "../../core/processes";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { formatProcessJson } from "../operationsOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

type ProcessCommandOptions = {
	files?: boolean;
	json?: unknown;
};

export async function processCommand(
	pid: string,
	optionsOrReadProcessDetail:
		| ProcessCommandOptions
		| ((pid: string) => Promise<ProcessDetail>) = {},
	readProcessDetail: (pid: string) => Promise<ProcessDetail> = getProcessDetail,
	readProcessFileSnapshot: (
		pid: string,
	) => Promise<ProcessFileSnapshot | undefined> = getProcessFileSnapshot,
	readProcessDetailResult: (
		pid: string,
	) => Promise<ProcessDetailResult> = getProcessDetailWithSource,
	readProcessFileSnapshotResult: (
		pid: string,
	) => Promise<ProcessFileSnapshotResult> = getProcessFileSnapshotWithSource,
): Promise<void> {
	const options =
		typeof optionsOrReadProcessDetail === "function"
			? {}
			: optionsOrReadProcessDetail;
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		if (json) {
			const numericPid = validateProcessId(pid);
			const detailResult = await readProcessDetailResult(pid);
			const fileResult = options.files
				? await readProcessFileSnapshotResult(pid)
				: undefined;
			await writeCliOutput(
				formatProcessJson({
					pid: numericPid,
					filesRequested: options.files ?? false,
					detailResult,
					fileResult,
				}),
			);
			return;
		}

		const reader =
			typeof optionsOrReadProcessDetail === "function"
				? optionsOrReadProcessDetail
				: readProcessDetail;
		const detailOutput = formatProcessDetail(await reader(pid));
		const fileOutput = options.files
			? formatProcessFileSnapshot(await readProcessFileSnapshot(pid))
			: "";
		console.log(`${detailOutput}${fileOutput}`);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("process", caught, {
				request: { pid, files: options.files ?? false },
			});
		}
		throw caught;
	}
}
