import {
	formatProcessDetail,
	formatProcessFileSnapshot,
	getProcessDetail,
	getProcessFileSnapshot,
	type ProcessDetail,
	type ProcessFileSnapshot,
} from "../../core/processes";

type ProcessCommandOptions = {
	files?: boolean;
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
): Promise<void> {
	const reader =
		typeof optionsOrReadProcessDetail === "function"
			? optionsOrReadProcessDetail
			: readProcessDetail;
	const detailOutput = formatProcessDetail(await reader(pid));
	const fileOutput =
		typeof optionsOrReadProcessDetail !== "function" &&
		optionsOrReadProcessDetail.files
			? formatProcessFileSnapshot(await readProcessFileSnapshot(pid))
			: "";
	console.log(`${detailOutput}${fileOutput}`);
}
