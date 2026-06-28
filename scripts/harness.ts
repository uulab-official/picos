type HarnessMode = "verify" | "smoke";

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

const steps = mode === "smoke" ? smokeSteps : verifySteps;

for (const step of steps) {
	await runStep(step);
}

console.log(`\nHarness complete: ${mode}`);

function parseMode(value: string | undefined): HarnessMode {
	if (value === "smoke" || value === "verify" || value === undefined) {
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
