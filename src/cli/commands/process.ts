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

// Seams live in their own parameter rather than inside the cac-populated options
// object, matching monitorCommand(), logsCommand(), and operationsCommand(). The
// parameter must sit immediately after `options`, which itself sits after the one
// bracket that `process <pid>` declares, because cac pushes one argument per
// declared bracket and then the options object.
type ProcessCommandSeams = {
	readProcessDetail?: (pid: string) => Promise<ProcessDetail>;
	readProcessFileSnapshot?: (
		pid: string,
	) => Promise<ProcessFileSnapshot | undefined>;
	readProcessDetailResult?: (pid: string) => Promise<ProcessDetailResult>;
	readProcessFileSnapshotResult?: (
		pid: string,
	) => Promise<ProcessFileSnapshotResult>;
};

export async function processCommand(
	pid: string,
	options: ProcessCommandOptions = {},
	seams: ProcessCommandSeams = {},
): Promise<void> {
	const readProcessDetail = seams.readProcessDetail ?? getProcessDetail;
	const readProcessFileSnapshot =
		seams.readProcessFileSnapshot ?? getProcessFileSnapshot;
	const readProcessDetailResult =
		seams.readProcessDetailResult ?? getProcessDetailWithSource;
	const readProcessFileSnapshotResult =
		seams.readProcessFileSnapshotResult ?? getProcessFileSnapshotWithSource;
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

		const detailOutput = formatProcessDetail(await readProcessDetail(pid));
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
