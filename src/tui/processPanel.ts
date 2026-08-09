import type {
	ProcessDetail,
	ProcessFileSnapshot,
	ProcessFileSnapshotResult,
	ProcessOpenFile,
} from "../core/processes";
import type { ProcessSummary } from "../core/types";
import {
	type ClipboardPreview,
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";
import type {
	EndpointProcessRequest,
	PortProcessControlFileEvidenceIssue,
} from "./endpointPanel";
import { clampIndex, getNextIndex } from "./navigation";

export type ProcessFileRequest = {
	path: string;
	command: string;
};

export type ProcessResourceRequest = {
	descriptor: string;
	label: string;
	resourceKind: ProcessOpenFile["resourceKind"];
	copyText: string;
	summary: string;
};

export type ProcessPanelNotice = {
	level: "info" | "warn" | "ok" | "fail";
	message: string;
};

export type ProcessInspectionStartTransition =
	| { kind: "inspect"; request: EndpointProcessRequest }
	| { kind: "notice"; notice: ProcessPanelNotice };

export type ProcessInspectionPublication =
	| { kind: "stale"; notice: ProcessPanelNotice }
	| {
			kind: "publish";
			detail: ProcessDetail;
			files: ProcessFileSnapshot | undefined;
			fileEvidenceIssue: PortProcessControlFileEvidenceIssue | undefined;
			selectedFileIndex: 0;
			clipboardPreview: false;
			notice: ProcessPanelNotice;
	  };

export type SelectedProcessResourceAction =
	| {
			kind: "file";
			request: ProcessFileRequest;
			notice: ProcessPanelNotice;
	  }
	| {
			kind: "resource";
			resource: ProcessResourceRequest;
			notice: ProcessPanelNotice;
	  }
	| { kind: "notice"; notice: ProcessPanelNotice };

export type ProcessPanelInputTransition =
	| SelectedProcessResourceAction
	| { kind: "copy"; preview: ClipboardPreview; clipboardPreview: true }
	| {
			kind: "selection";
			selectedIndex: number;
			clipboardPreview: false;
	  }
	| { kind: "no-op" };

export function prepareSelectedProcessInspection(input: {
	screen: string;
	connectionRequest?: EndpointProcessRequest;
	portRequest?: EndpointProcessRequest;
}): ProcessInspectionStartTransition {
	const request =
		input.screen === "connections"
			? input.connectionRequest
			: input.screen === "ports"
				? input.portRequest
				: undefined;
	return request
		? { kind: "inspect", request }
		: {
				kind: "notice",
				notice: {
					level: "warn",
					message: "no process PID available for selected endpoint",
				},
			};
}

export function classifyProcessInspectionPublication(input: {
	currentToken: number;
	requestToken: number;
	request: EndpointProcessRequest;
	detail: ProcessDetail;
	fileResult: ProcessFileSnapshotResult;
}): ProcessInspectionPublication {
	if (input.currentToken !== input.requestToken) {
		return {
			kind: "stale",
			notice: {
				level: "info",
				message: `process inspection superseded ${input.request.command}`,
			},
		};
	}

	const { source, snapshot } = input.fileResult;
	if (!source.supported) {
		return processInspectionPublication(input, undefined, {
			status: "unavailable",
			pid: input.request.pid,
			reason: "collector unsupported",
		});
	}
	if (source.success === false) {
		return processInspectionPublication(input, undefined, {
			status: "error",
			pid: input.request.pid,
			reason: `collector failed exit=${source.exitCode ?? "unknown"}`,
		});
	}
	if (!snapshot) {
		return processInspectionPublication(input, undefined, {
			status: "unavailable",
			pid: input.request.pid,
			reason: "no snapshot returned",
		});
	}
	return processInspectionPublication(input, snapshot);
}

export function classifyProcessInspectionFailure(input: {
	currentToken: number;
	requestToken: number;
	request: EndpointProcessRequest;
	error: unknown;
}): {
	publishCurrent: boolean;
	fileEvidenceIssue: PortProcessControlFileEvidenceIssue | undefined;
	notice: ProcessPanelNotice;
} {
	const message =
		input.error instanceof Error ? input.error.message : String(input.error);
	const publishCurrent = input.currentToken === input.requestToken;
	return {
		publishCurrent,
		fileEvidenceIssue: publishCurrent
			? { status: "error", pid: input.request.pid, reason: message }
			: undefined,
		notice: { level: "fail", message },
	};
}

export function prepareSelectedProcessResourceAction(
	files: ProcessFileSnapshot | undefined,
	selectedIndex: number,
): SelectedProcessResourceAction {
	const request = getSelectedProcessFileRequest(files, selectedIndex);
	if (request) {
		return {
			kind: "file",
			request,
			notice: {
				level: "ok",
				message: `process file opened ${request.command}`,
			},
		};
	}
	const resource = getSelectedProcessResourceRequest(files, selectedIndex);
	if (resource) {
		return {
			kind: "resource",
			resource,
			notice: {
				level: "info",
				message: `process resource ${resource.summary}`,
			},
		};
	}
	return {
		kind: "notice",
		notice: {
			level: "warn",
			message: "selected process file is not openable",
		},
	};
}

export function prepareProcessPanelInput(input: {
	input: string;
	direction?: "next" | "previous";
	files: ProcessFileSnapshot | undefined;
	selectedIndex: number;
}): ProcessPanelInputTransition {
	if (input.input === "\r") {
		return prepareSelectedProcessResourceAction(
			input.files,
			input.selectedIndex,
		);
	}
	if (input.input === "c") {
		const preview = getSelectedProcessClipboardPreview(
			input.files,
			input.selectedIndex,
		);
		return preview
			? { kind: "copy", preview, clipboardPreview: true }
			: {
					kind: "notice",
					notice: {
						level: "warn",
						message: "no process resource selected",
					},
				};
	}
	const direction =
		input.direction ??
		(input.input === "j"
			? "next"
			: input.input === "k"
				? "previous"
				: undefined);
	if (direction) {
		return {
			kind: "selection",
			selectedIndex: getNextIndex(
				input.selectedIndex,
				getProcessFileSelectionCount(input.files),
				direction,
			),
			clipboardPreview: false,
		};
	}
	return { kind: "no-op" };
}

export function formatProcessWorkspaceRows(
	processes: ProcessSummary[],
	selected?: ProcessDetail,
	files?: ProcessFileSnapshot,
	visibleRows = 12,
	selectedFileIndex = 0,
	copyPreview = false,
	fileEvidenceIssue?: PortProcessControlFileEvidenceIssue,
): string[] {
	const rows = [
		`SUMMARY processes=${processes.length} selected=${selected?.pid ?? "-"}`,
		"SNAPSHOT",
		...formatSnapshotRows(processes),
		...formatDetailRows(
			selected,
			files,
			selectedFileIndex,
			copyPreview,
			fileEvidenceIssue,
		),
	];
	return fitRows(rows, visibleRows, "processes");
}

export function getProcessFileSelectionCount(
	files: ProcessFileSnapshot | undefined,
): number {
	return getSelectableProcessFiles(files).length;
}

export function getSelectedProcessFileRequest(
	files: ProcessFileSnapshot | undefined,
	selectedIndex: number,
): ProcessFileRequest | undefined {
	const entries = getSelectableProcessFiles(files);
	const entry = entries[getSelectedIndex(entries.length, selectedIndex) ?? -1];
	if (!entry || !isFilesystemPath(entry.path)) {
		return undefined;
	}
	return {
		path: entry.path,
		command: `${entry.command} ${formatCommandPath(entry.path)}`,
	};
}

export function getSelectedProcessResourceRequest(
	files: ProcessFileSnapshot | undefined,
	selectedIndex: number,
): ProcessResourceRequest | undefined {
	const entries = getSelectableProcessFiles(files);
	const entry = entries[getSelectedIndex(entries.length, selectedIndex) ?? -1];
	if (!entry || entry.resourceKind === "file") {
		return undefined;
	}
	return {
		descriptor: entry.descriptor,
		label: entry.label,
		resourceKind: entry.resourceKind,
		copyText: entry.path,
		summary: `${entry.resourceKind} ${entry.descriptor} ${entry.label} ${entry.path}`,
	};
}

export function getSelectedProcessClipboardPreview(
	files: ProcessFileSnapshot | undefined,
	selectedIndex: number,
): ClipboardPreview | undefined {
	const entries = getSelectableProcessFiles(files);
	const entry = entries[getSelectedIndex(entries.length, selectedIndex) ?? -1];
	if (!entry) {
		return undefined;
	}
	return createClipboardPreview({
		source: "process-resource",
		label: `${entry.resourceKind} ${entry.descriptor} ${entry.label}`,
		copyText: entry.path,
	});
}

function formatSnapshotRows(processes: ProcessSummary[]): string[] {
	if (processes.length === 0) {
		return ["loading..."];
	}
	return processes.map(
		(process) =>
			`${String(process.pid).padEnd(7)} ${formatPercent(process.cpu).padEnd(6)} ${formatPercent(process.memory).padEnd(6)} ${process.command}`,
	);
}

function formatPercent(value: string | undefined): string {
	return value ? `${value}%` : "-";
}

function formatDetailRows(
	selected: ProcessDetail | undefined,
	files: ProcessFileSnapshot | undefined,
	selectedFileIndex: number,
	copyPreview: boolean,
	fileEvidenceIssue: PortProcessControlFileEvidenceIssue | undefined,
): string[] {
	if (!selected) {
		return [];
	}
	const selectedClipboardPreview = copyPreview
		? getSelectedProcessClipboardPreview(files, selectedFileIndex)
		: undefined;
	return [
		`DETAIL pid=${selected.pid} ppid=${selected.ppid ?? "-"} user=${selected.user ?? "-"} state=${selected.state ?? "-"}`,
		`usage cpu=${selected.cpu ?? "-"}% mem=${selected.memory ?? "-"}% elapsed=${selected.elapsed ?? "-"}`,
		`command ${selected.command || "-"}`,
		"FILES",
		...formatProcessFileRows(
			files,
			selectedFileIndex,
			fileEvidenceIssue?.pid === String(selected.pid)
				? fileEvidenceIssue
				: undefined,
		),
		...(selectedClipboardPreview
			? formatClipboardPreviewRows(selectedClipboardPreview)
			: []),
	];
}

function formatProcessFileRows(
	files: ProcessFileSnapshot | undefined,
	selectedFileIndex: number,
	fileEvidenceIssue: PortProcessControlFileEvidenceIssue | undefined,
): string[] {
	if (fileEvidenceIssue) {
		return [
			`fileEvidence status=${fileEvidenceIssue.status} pid=${fileEvidenceIssue.pid} reason=${formatProcessFileEvidenceReason(fileEvidenceIssue.reason)}`,
		];
	}
	const entries = getSelectableProcessFiles(files);
	if (entries.length === 0) {
		return ["- none detected"];
	}
	const selectedIndex =
		getSelectedIndex(entries.length, selectedFileIndex) ?? 0;
	return entries.map((entry, index) => {
		const marker = index === selectedIndex ? ">" : " ";
		return `${marker} ${entry.descriptor.padEnd(4)} ${entry.label.padEnd(11)} ${entry.path}`;
	});
}

function formatProcessFileEvidenceReason(reason: string): string {
	return reason.trim().replace(/\s+/g, " ") || "unknown";
}

type SelectableProcessFile = {
	descriptor: string;
	label: string;
	path: string;
	resourceKind: ProcessOpenFile["resourceKind"];
	command: "picos dir" | "picos type";
};

function getSelectableProcessFiles(
	files: ProcessFileSnapshot | undefined,
): SelectableProcessFile[] {
	if (!files) {
		return [];
	}
	const entries: SelectableProcessFile[] = [];
	if (files.cwd) {
		entries.push({
			descriptor: "cwd",
			label: "working-dir",
			path: files.cwd,
			resourceKind: "file",
			command: "picos dir",
		});
	}
	const fileEntries = files.fileEntries.length
		? files.fileEntries
		: files.openFiles.map(
				(path): ProcessOpenFile => ({
					descriptor: "file",
					label: "file",
					resourceKind: "file",
					path,
				}),
			);
	for (const entry of fileEntries) {
		entries.push({
			descriptor: entry.descriptor || "file",
			label: entry.label || "file",
			path: entry.path,
			resourceKind: entry.resourceKind,
			command: "picos type",
		});
	}
	return entries;
}

function getSelectedIndex(
	total: number,
	selectedIndex: number,
): number | undefined {
	if (total <= 0) {
		return undefined;
	}
	return clampIndex(selectedIndex, total);
}

function processInspectionPublication(
	input: { request: EndpointProcessRequest; detail: ProcessDetail },
	files: ProcessFileSnapshot | undefined,
	fileEvidenceIssue?: PortProcessControlFileEvidenceIssue,
): ProcessInspectionPublication {
	const suffix = fileEvidenceIssue
		? fileEvidenceIssue.reason === "collector unsupported"
			? "; file evidence unsupported"
			: `; file evidence ${fileEvidenceIssue.reason}`
		: "";
	return {
		kind: "publish",
		detail: input.detail,
		files,
		fileEvidenceIssue,
		selectedFileIndex: 0,
		clipboardPreview: false,
		notice: {
			level: fileEvidenceIssue ? "warn" : "ok",
			message: `process inspected ${input.request.command}${suffix}`,
		},
	};
}

function isFilesystemPath(path: string): boolean {
	return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

function formatCommandPath(path: string): string {
	if (!/\s/.test(path)) {
		return path;
	}
	return `"${path.replaceAll('"', '\\"')}"`;
}

function fitRows(rows: string[], visibleRows: number, label: string): string[] {
	if (rows.length <= visibleRows) {
		return rows;
	}
	if (visibleRows <= 1) {
		return [`↓ ${rows.length} more ${label}`];
	}
	const visible = rows.slice(0, visibleRows - 1);
	return [...visible, `↓ ${rows.length - visible.length} more ${label}`];
}
