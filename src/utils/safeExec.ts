import { spawn } from "node:child_process";
import type { SafeExecResult } from "../core/types";

export type SafeExecOptions = {
	timeoutMs?: number;
	stdin?: string;
	maxOutputBytes?: number;
};

export const DEFAULT_SAFE_EXEC_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const SAFE_EXEC_TERMINATION_GRACE_MS = 250;
const SAFE_EXEC_FORCE_KILL_SETTLE_MS = 1_000;

export function safeExec(
	command: string,
	args: string[],
	options: SafeExecOptions = {},
): Promise<SafeExecResult> {
	const timeoutMs = options.timeoutMs ?? 5000;
	const maxOutputBytes =
		options.maxOutputBytes ?? DEFAULT_SAFE_EXEC_MAX_OUTPUT_BYTES;
	if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) {
		throw new Error("safeExec maxOutputBytes must be a positive integer");
	}

	return new Promise((resolve) => {
		const child = spawn(command, args, {
			detached: process.platform !== "win32",
			shell: false,
			windowsHide: true,
		});

		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];
		let settled = false;
		let outputBytes = 0;
		let truncated = false;
		let terminationRequested = false;
		let terminationTimer: ReturnType<typeof setTimeout> | undefined;

		const finish = (exitCode: number | null) => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			if (terminationTimer) clearTimeout(terminationTimer);
			const stdout = decodeWithinByteBudget(
				Buffer.concat(stdoutChunks),
				stdoutChunks.reduce((total, chunk) => total + chunk.length, 0),
			);
			const stderr = decodeWithinByteBudget(
				Buffer.concat(stderrChunks),
				stderrChunks.reduce((total, chunk) => total + chunk.length, 0),
			);
			resolve({
				command,
				args,
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				exitCode,
				success: exitCode === 0 && !truncated && !terminationRequested,
				truncated,
			});
		};

		const timer = setTimeout(() => {
			requestTermination();
		}, timeoutMs);

		child.stdout?.on("data", (chunk) => captureOutput("stdout", chunk));

		child.stderr?.on("data", (chunk) => captureOutput("stderr", chunk));

		if (options.stdin !== undefined) {
			child.stdin?.end(options.stdin);
		} else {
			child.stdin?.end();
		}

		child.on("error", (error) => {
			stderrChunks.push(Buffer.from(error.message));
			if (child.pid) requestTermination();
			else finish(1);
		});

		child.on("close", finish);

		function captureOutput(stream: "stdout" | "stderr", chunk: unknown) {
			if (settled || terminationRequested) return;
			const buffer = Buffer.isBuffer(chunk)
				? chunk
				: Buffer.from(String(chunk));
			const remaining = maxOutputBytes - outputBytes;
			const captured = buffer.subarray(0, Math.max(0, remaining));
			if (captured.length > 0) {
				if (stream === "stdout") stdoutChunks.push(captured);
				else stderrChunks.push(captured);
			}
			outputBytes += captured.length;
			if (captured.length < buffer.length) {
				truncated = true;
				requestTermination();
			}
		}

		function requestTermination() {
			if (settled || terminationRequested) return;
			terminationRequested = true;
			signalProcessTree("SIGTERM");
			terminationTimer = setTimeout(() => {
				if (settled) return;
				signalProcessTree("SIGKILL");
				terminationTimer = setTimeout(
					() => finish(null),
					SAFE_EXEC_FORCE_KILL_SETTLE_MS,
				);
			}, SAFE_EXEC_TERMINATION_GRACE_MS);
		}

		function signalProcessTree(signal: NodeJS.Signals) {
			if (process.platform !== "win32" && child.pid) {
				try {
					process.kill(-child.pid, signal);
					return;
				} catch {
					// Fall through to the direct-child signal if the group is already gone.
				}
			}
			child.kill(signal);
		}
	});
}

function decodeWithinByteBudget(buffer: Buffer, byteBudget: number): string {
	const decoded = buffer.toString("utf8");
	if (Buffer.byteLength(decoded, "utf8") <= byteBudget) return decoded;
	let bytes = 0;
	let output = "";
	for (const character of decoded) {
		const characterBytes = Buffer.byteLength(character, "utf8");
		if (bytes + characterBytes > byteBudget) break;
		output += character;
		bytes += characterBytes;
	}
	return output;
}
