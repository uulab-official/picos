export {};

type HarnessMode =
	| "verify"
	| "smoke"
	| "sftp"
	| "local-json"
	| "diagnostics-json";

type Step = {
	name: string;
	cmd: string[];
};

const mode = parseMode(process.argv[2]);

const smokeSteps: Step[] = [
	{
		name: "CLI version",
		cmd: ["bun", "src/bin/picos.ts", "version"],
	},
	{
		name: "Config read",
		cmd: ["bun", "src/bin/picos.ts", "config", "get", "theme"],
	},
];

const verifySteps: Step[] = [
	{
		name: "Lint",
		cmd: ["bun", "run", "lint"],
	},
	{
		name: "Tests",
		cmd: ["bun", "test"],
	},
	{
		name: "Local inspector JSON integration",
		cmd: ["bun", "run", "integration:local-json"],
	},
	{
		name: "Diagnostics JSON integration",
		cmd: ["bun", "run", "integration:diagnostics-json"],
	},
	{
		name: "Credentialed SFTP integration",
		cmd: ["bun", "run", "integration:sftp"],
	},
	{
		name: "Typecheck",
		cmd: ["bun", "run", "typecheck"],
	},
	{
		name: "Build",
		cmd: ["bun", "run", "build"],
	},
	{
		name: "Smoke",
		cmd: ["bun", "run", "smoke"],
	},
];

const sftpSteps: Step[] = [
	{
		name: "Credentialed SFTP integration",
		cmd: ["bun", "run", "integration:sftp"],
	},
];

const localJsonSteps: Step[] = [
	{
		name: "Local inspector JSON integration",
		cmd: ["bun", "run", "integration:local-json"],
	},
];

const diagnosticsJsonSteps: Step[] = [
	{
		name: "Diagnostics JSON integration",
		cmd: ["bun", "run", "integration:diagnostics-json"],
	},
];

const steps =
	mode === "smoke"
		? smokeSteps
		: mode === "sftp"
			? sftpSteps
			: mode === "local-json"
				? localJsonSteps
				: mode === "diagnostics-json"
					? diagnosticsJsonSteps
					: verifySteps;

for (const step of steps) {
	await runStep(step);
}

console.log(`\nHarness complete: ${mode}`);

function parseMode(value: string | undefined): HarnessMode {
	if (
		value === "smoke" ||
		value === "verify" ||
		value === "sftp" ||
		value === "local-json" ||
		value === "diagnostics-json" ||
		value === undefined
	) {
		return value ?? "verify";
	}

	throw new Error(`Unknown harness mode: ${value}`);
}

async function runStep(step: Step): Promise<void> {
	console.log(`\n==> ${step.name}`);
	console.log(`$ ${step.cmd.join(" ")}`);

	const proc = Bun.spawn(step.cmd, {
		stdout: "pipe",
		stderr: "pipe",
	});

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	if (stdout.trim()) {
		console.log(stdout.trim());
	}

	if (stderr.trim()) {
		console.error(stderr.trim());
	}

	if (exitCode !== 0) {
		throw new Error(`${step.name} failed with exit code ${exitCode}`);
	}
}
