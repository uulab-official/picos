import {
	formatProcessDetail,
	getProcessDetail,
	type ProcessDetail,
} from "../../core/processes";

export async function processCommand(
	pid: string,
	optionsOrReadProcessDetail:
		| Record<string, unknown>
		| ((pid: string) => Promise<ProcessDetail>) = {},
	readProcessDetail: (pid: string) => Promise<ProcessDetail> = getProcessDetail,
): Promise<void> {
	const reader =
		typeof optionsOrReadProcessDetail === "function"
			? optionsOrReadProcessDetail
			: readProcessDetail;
	console.log(formatProcessDetail(await reader(pid)));
}
