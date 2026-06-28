import { spawn } from "node:child_process";
import type { SafeExecResult } from "../core/types";

export type SafeExecOptions = {
	timeoutMs?: number;
};

export function safeExec(
	command: string,
	args: string[],
	options: SafeExecOptions = {},
): Promise<SafeExecResult> {
	const timeoutMs = options.timeoutMs ?? 5000;

	return new Promise((resolve) => {
		const child = spawn(command, args, {
			shell: false,
			windowsHide: true,
		});

		let stdout = "";
		let stderr = "";
		let settled = false;

		const finish = (exitCode: number | null) => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			resolve({
				command,
				args,
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				exitCode,
				success: exitCode === 0,
			});
		};

		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			finish(null);
		}, timeoutMs);

		child.stdout?.on("data", (chunk) => {
			stdout += chunk.toString();
		});

		child.stderr?.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		child.on("error", (error) => {
			stderr += error.message;
			finish(1);
		});

		child.on("close", finish);
	});
}
