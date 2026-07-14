import { safeExec } from "../utils/safeExec";
import type {
	InventorySourceStatus,
	ProcessSummary,
	SupportedPlatform,
} from "./types";

export type ProcessSummaryResult = {
	processes: ProcessSummary[];
	source: InventorySourceStatus;
};

export type ProcessDetail = ProcessSummary & {
	ppid?: number;
	user?: string;
	state?: string;
	elapsed?: string;
	name?: string;
	executablePath?: string;
	started?: string;
};

export type ProcessOpenFile = {
	descriptor: string;
	label: string;
	resourceKind: "file" | "socket" | "pipe" | "unix" | "unknown";
	path: string;
};

export type ProcessFileSnapshot = {
	pid: number;
	cwd?: string;
	fileEntries: ProcessOpenFile[];
	openFiles: string[];
	rawOutput: string;
};

export function parsePsOutput(stdout: string, limit = 12): ProcessSummary[] {
	return stdout
		.split(/\r?\n/)
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.flatMap((line): ProcessSummary[] => {
			const match = line.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/);
			if (!match) {
				return [];
			}
			return [
				{
					pid: Number(match[1]),
					cpu: match[2],
					memory: match[3],
					command: match[4],
				},
			];
		})
		.slice(0, limit);
}

export async function getProcessSummary(limit = 12): Promise<ProcessSummary[]> {
	return (await getProcessSummaryWithSource(limit)).processes;
}

export async function getProcessSummaryWithSource(
	limit = 12,
	platform: SupportedPlatform = process.platform,
): Promise<ProcessSummaryResult> {
	if (platform === "win32") {
		return {
			processes: [],
			source: unsupportedProcessSource(),
		};
	}

	const args = ["-axo", "pid,pcpu,pmem,command"];
	const result = await safeExec("ps", args, {
		timeoutMs: 5000,
	});
	const parsed = result.success
		? parsePsOutput(result.stdout, Number.MAX_SAFE_INTEGER)
		: [];
	return {
		processes: parsed.slice(0, limit),
		source: {
			key: "processes",
			command: "ps",
			args,
			supported: true,
			success: result.success,
			exitCode: result.exitCode,
			truncated: result.truncated ?? false,
			totalCount: parsed.length,
		},
	};
}

function unsupportedProcessSource(): InventorySourceStatus {
	return {
		key: "processes",
		command: null,
		args: [],
		supported: false,
		success: null,
		exitCode: null,
		truncated: false,
		totalCount: 0,
	};
}

export function validateProcessId(value: string | number): number {
	const text = String(value).trim();
	if (!/^[1-9]\d{0,9}$/.test(text)) {
		throw new Error(`Invalid process id: ${value}`);
	}
	return Number(text);
}

export function buildProcessDetailCommand(
	pid: number,
	platform: SupportedPlatform = process.platform,
): { command: string; args: string[] } {
	const safePid = validateProcessId(pid);
	if (platform === "win32") {
		return {
			command: "powershell",
			args: [
				"-NoProfile",
				"-Command",
				`Get-CimInstance Win32_Process -Filter "ProcessId = ${safePid}" | Select-Object ProcessId,ParentProcessId,Name,CommandLine,ExecutablePath,CreationDate | ConvertTo-Json -Compress`,
			],
		};
	}
	return {
		command: "ps",
		args: [
			"-p",
			String(safePid),
			"-o",
			"pid=,ppid=,user=,stat=,pcpu=,pmem=,etime=,command=",
		],
	};
}

export function buildProcessFilesCommand(
	pid: number,
	platform: SupportedPlatform = process.platform,
): { command: string; args: string[] } | undefined {
	const safePid = validateProcessId(pid);
	if (platform === "win32") {
		return undefined;
	}
	return {
		command: "lsof",
		args: ["-a", "-p", String(safePid), "-Fn", "-w"],
	};
}

export async function getProcessDetail(
	pidInput: string | number,
): Promise<ProcessDetail> {
	const pid = validateProcessId(pidInput);
	const { command, args } = buildProcessDetailCommand(pid);
	const result = await safeExec(command, args, { timeoutMs: 5000 });
	if (!result.success) {
		throw new Error(`Process detail lookup failed for pid ${pid}`);
	}
	const detail =
		process.platform === "win32"
			? parseWindowsProcessDetail(result.stdout)
			: parsePosixProcessDetail(result.stdout);
	if (!detail) {
		throw new Error(`Process not found: ${pid}`);
	}
	return detail;
}

export async function getProcessFileSnapshot(
	pidInput: string | number,
	limit = 20,
): Promise<ProcessFileSnapshot | undefined> {
	const pid = validateProcessId(pidInput);
	const command = buildProcessFilesCommand(pid);
	if (!command) {
		return undefined;
	}
	const result = await safeExec(command.command, command.args, {
		timeoutMs: 5000,
	});
	if (!result.success) {
		return undefined;
	}
	return parseLsofProcessFiles(result.stdout, limit);
}

export function parsePosixProcessDetail(
	stdout: string,
): ProcessDetail | undefined {
	const line = stdout
		.split(/\r?\n/)
		.map((item) => item.trim())
		.find(Boolean);
	if (!line) {
		return undefined;
	}
	const match = line.match(
		/^(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/,
	);
	if (!match) {
		return undefined;
	}
	return {
		pid: Number(match[1]),
		ppid: Number(match[2]),
		user: match[3],
		state: match[4],
		cpu: match[5],
		memory: match[6],
		elapsed: match[7],
		command: match[8],
	};
}

export function parseWindowsProcessDetail(
	stdout: string,
): ProcessDetail | undefined {
	const text = stdout.trim();
	if (!text) {
		return undefined;
	}
	const parsed = JSON.parse(text);
	const item = Array.isArray(parsed) ? parsed[0] : parsed;
	if (!item?.ProcessId) {
		return undefined;
	}
	const command = String(item.CommandLine || item.Name || "");
	return {
		pid: Number(item.ProcessId),
		ppid:
			item.ParentProcessId === undefined
				? undefined
				: Number(item.ParentProcessId),
		name: item.Name ? String(item.Name) : undefined,
		command,
		executablePath: item.ExecutablePath
			? String(item.ExecutablePath)
			: undefined,
		started: item.CreationDate ? String(item.CreationDate) : undefined,
	};
}

export function parseLsofProcessFiles(
	stdout: string,
	limit = 20,
): ProcessFileSnapshot | undefined {
	const lines = stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	const pidLine = lines.find((line) => line.startsWith("p"));
	if (!pidLine) {
		return undefined;
	}
	const snapshot: ProcessFileSnapshot = {
		pid: Number(pidLine.slice(1)),
		fileEntries: [],
		openFiles: [],
		rawOutput: stdout,
	};
	let fileKind = "";
	const seen = new Set<string>();
	for (const line of lines) {
		if (line.startsWith("f")) {
			fileKind = line.slice(1);
			continue;
		}
		if (!line.startsWith("n")) {
			continue;
		}
		const path = line.slice(1);
		if (!path) {
			continue;
		}
		if (fileKind === "cwd") {
			snapshot.cwd = path;
			continue;
		}
		if (!seen.has(path) && snapshot.openFiles.length < limit) {
			seen.add(path);
			snapshot.openFiles.push(path);
			snapshot.fileEntries.push({
				descriptor: fileKind,
				...classifyProcessResource(fileKind, path),
				path,
			});
		}
	}
	return snapshot;
}

function classifyProcessResource(
	descriptor: string,
	path: string,
): Pick<ProcessOpenFile, "label" | "resourceKind"> {
	const lowerPath = path.toLowerCase();
	if (/^(tcp|udp|ipv4|ipv6)\b/i.test(path)) {
		return { label: "socket", resourceKind: "socket" };
	}
	if (lowerPath === "pipe" || lowerPath.startsWith("pipe ")) {
		return { label: "pipe", resourceKind: "pipe" };
	}
	if (lowerPath.startsWith("unix ")) {
		return { label: "unix", resourceKind: "unix" };
	}
	if (lowerPath.endsWith(".sock")) {
		return { label: "socket-file", resourceKind: "file" };
	}
	if (descriptor === "txt") {
		return { label: "executable", resourceKind: "file" };
	}
	if (descriptor === "mem") {
		return { label: "mapped", resourceKind: "file" };
	}
	if (descriptor === "rtd") {
		return { label: "root", resourceKind: "file" };
	}
	if (/^\d/.test(descriptor)) {
		return { label: "fd", resourceKind: "file" };
	}
	return { label: descriptor || "file", resourceKind: "unknown" };
}

export function formatProcessDetail(detail: ProcessDetail): string {
	const lines = [
		"picos process",
		"",
		`PID:      ${detail.pid}`,
		`PPID:     ${detail.ppid ?? "-"}`,
		`User:     ${detail.user ?? "-"}`,
		`State:    ${detail.state ?? "-"}`,
		`CPU:      ${detail.cpu ? `${detail.cpu}%` : "-"}`,
		`Memory:   ${detail.memory ? `${detail.memory}%` : "-"}`,
		`Elapsed:  ${detail.elapsed ?? "-"}`,
		`Name:     ${detail.name ?? "-"}`,
		`Started:  ${detail.started ?? "-"}`,
		`Path:     ${detail.executablePath ?? "-"}`,
		`Command:  ${detail.command || "-"}`,
	];
	return lines.join("\n");
}

export function formatProcessFileSnapshot(
	snapshot: ProcessFileSnapshot | undefined,
): string {
	if (!snapshot) {
		return ["", "Files", "  file snapshot unavailable"].join("\n");
	}
	const fileEntries = snapshot.fileEntries.length
		? snapshot.fileEntries
		: snapshot.openFiles.map((path) => ({
				descriptor: "file",
				label: "file",
				resourceKind: "file" as const,
				path,
			}));
	const files = fileEntries.length
		? fileEntries.map(
				(entry) =>
					`  ${entry.descriptor.padEnd(4)} ${entry.label.padEnd(11)} ${entry.path}`,
			)
		: ["  - none detected"];
	return [
		"",
		"Files",
		`  CWD:      ${snapshot.cwd ?? "-"}`,
		"  Open:",
		...files,
	].join("\n");
}
