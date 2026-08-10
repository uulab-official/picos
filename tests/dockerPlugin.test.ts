import { describe, expect, test } from "bun:test";
import {
	collectDockerPlugin,
	normalizeDockerText,
	parseDockerContainerSummaries,
	parseDockerEngineSummary,
} from "../src/core/dockerPlugin";
import type { SafeExecResult } from "../src/core/types";

const result = (
	stdout: string,
	overrides: Partial<SafeExecResult> = {},
): SafeExecResult => ({
	command: "docker",
	args: [],
	stdout,
	stderr: "",
	exitCode: 0,
	success: true,
	truncated: false,
	...overrides,
});

const failed = (stderr: string): SafeExecResult =>
	result("", { stderr, exitCode: 1, success: false });

const sequenceExec =
	(results: SafeExecResult[]) => async (): Promise<SafeExecResult> => {
		const next = results.shift();
		if (!next) throw new Error("unexpected Docker collector call");
		return next;
	};

describe("Docker plugin collector", () => {
	test("aggregates successful Docker collector results", async () => {
		// Break caught: successful Docker evidence is not parsed into the plugin snapshot.
		const completed = await collectDockerPlugin({
			exec: sequenceExec([
				result("Docker version 28.3.0, build abc"),
				result("desktop-linux"),
				result("28.3.0\t3\t1\t1\t1\t12"),
				result("abc123\tapi\tregistry.example/api:1\trunning\tUp 2 hours"),
			]),
		});

		expect(completed).toMatchObject({
			id: "docker",
			status: "completed",
			data: {
				clientVersion: "28.3.0",
				context: "desktop-linux",
				engineVersion: "28.3.0",
			},
		});
		expect(completed.data.containers).toHaveLength(1);
	});

	test("clamps an over-limit timeout before starting Docker plans", async () => {
		// Break caught: caller-provided timeouts can exceed the fixed collection bound.
		const timeouts: number[] = [];
		const responses = [
			result("Docker version 28.3.0"),
			result("default"),
			result("28.3.0\t0\t0\t0\t0\t0"),
			result(""),
		];
		const snapshot = await collectDockerPlugin({
			timeoutMs: 6_000,
			exec: async (_command, _args, options) => {
				timeouts.push(options?.timeoutMs ?? 0);
				const response = responses.shift();
				if (!response) throw new Error("unexpected Docker collector call");
				return response;
			},
		});

		expect(snapshot.status).toBe("completed");
		expect(timeouts).toEqual([5_000, 5_000, 5_000, 5_000]);
	});

	test("clamps an over-limit container option before publishing rows", async () => {
		// Break caught: caller-provided limits can publish more than 200 containers.
		const containerRows = Array.from(
			{ length: 201 },
			(_, index) =>
				`id-${index}\tcontainer-${index}\timage-${index}\trunning\tUp`,
		).join("\n");
		const snapshot = await collectDockerPlugin({
			containerLimit: 201,
			exec: sequenceExec([
				result("Docker version 28.3.0"),
				result("default"),
				result("28.3.0\t201\t201\t0\t0\t1"),
				result(containerRows),
			]),
		});

		expect(snapshot.data.containers).toHaveLength(200);
		expect(snapshot).toMatchObject({
			resultTruncated: true,
			data: { requestedContainerLimit: 200, returnedContainerCount: 200 },
		});
	});

	test("stops after an unavailable Docker client probe", async () => {
		// Break caught: a missing Docker executable still runs daemon collectors.
		const unsupported = await collectDockerPlugin({
			exec: sequenceExec([failed("spawn docker ENOENT")]),
		});

		expect(unsupported.status).toBe("unsupported");
		expect(unsupported.evidence).toHaveLength(1);
	});

	test("reports daemon failures as partial without retaining credentials", async () => {
		// Break caught: daemon failures are mislabeled unsupported or leak diagnostics.
		const partial = await collectDockerPlugin({
			exec: sequenceExec([
				result("Docker version 28.3.0"),
				result("default"),
				failed(
					"Cannot connect to daemon TOKEN=secret Authorization: Bearer bearer-secret /Users/uulab/.docker/config.json",
				),
				failed("Cannot connect to daemon password=secret"),
			]),
		});

		expect(partial).toMatchObject({
			status: "partial",
			data: { clientVersion: "28.3.0", context: "default" },
		});
		expect(JSON.stringify(partial)).not.toContain("TOKEN=secret");
		expect(JSON.stringify(partial)).not.toContain("bearer-secret");
		expect(JSON.stringify(partial)).not.toContain("/Users/uulab");
	});

	test("limits returned container rows separately from source truncation", async () => {
		// Break caught: a large Docker listing can exceed the result row bound.
		const containerRows = Array.from(
			{ length: 201 },
			(_, index) =>
				`id-${index}\tcontainer-${index}\timage-${index}\trunning\tUp`,
		).join("\n");
		const snapshot = await collectDockerPlugin({
			exec: sequenceExec([
				result("Docker version 28.3.0"),
				result("default"),
				result("28.3.0\t201\t201\t0\t0\t1"),
				result(containerRows),
			]),
		});

		expect(snapshot.data.containers).toHaveLength(200);
		expect(snapshot).toMatchObject({
			sourceTruncated: false,
			resultTruncated: true,
			data: { returnedContainerCount: 200, requestedContainerLimit: 200 },
		});
	});

	test("bounds container fields to the Docker text limit", () => {
		// Break caught: unbounded Docker text can enter a plugin snapshot.
		const longValue = "a".repeat(257);
		const [container] = parseDockerContainerSummaries(
			`${longValue}\tname\timage\trunning\tUp`,
		);

		expect(container?.id).toBe(`${"a".repeat(253)}...`);
	});

	test("keeps valid engine values while marking malformed numeric fields partial", async () => {
		// Break caught: malformed Docker engine counts become misleading numbers.
		expect(parseDockerEngineSummary("28.3.0\tbad\t1\t0\t0\t12")).toEqual({
			engineVersion: "28.3.0",
			containerCounts: { total: null, running: 1, paused: 0, stopped: 0 },
			imageCount: 12,
			malformed: true,
		});
		const snapshot = await collectDockerPlugin({
			exec: sequenceExec([
				result("Docker version 28.3.0"),
				result("default"),
				result("28.3.0\tbad\t1\t0\t0\t12"),
				result(""),
			]),
		});

		expect(snapshot.status).toBe("partial");
		expect(snapshot.data.containerCounts.total).toBeNull();
	});

	test("publishes source truncation and unknown exit codes as partial evidence", async () => {
		// Break caught: incomplete command evidence is published as a completed snapshot.
		const snapshot = await collectDockerPlugin({
			exec: sequenceExec([
				result("Docker version 28.3.0", { truncated: true }),
				result("default", { exitCode: null, success: false }),
				result("28.3.0\t0\t0\t0\t0\t0"),
				result(""),
			]),
		});

		expect(snapshot).toMatchObject({
			status: "partial",
			sourceTruncated: true,
		});
		expect(snapshot.evidence[1]?.exitCode).toBeNull();
	});

	test("normalizes credential-shaped diagnostics and home paths", () => {
		// Break caught: credential-shaped diagnostics or home paths reach consumers.
		const normalized = normalizeDockerText(
			"password=secret token=secret Authorization: Bearer secret /home/operator/.docker/config.json",
		);

		expect(normalized).toContain("password=[REDACTED]");
		expect(normalized).toContain("token=[REDACTED]");
		expect(normalized).toContain("Authorization: [REDACTED]");
		expect(normalized).toContain("$HOME/.docker/config.json");
		expect(normalized).not.toContain("secret");
		expect(normalized).not.toContain("/home/operator");
	});

	test("redacts Authorization values without a scheme", () => {
		// Break caught: an Authorization value without Bearer or Basic reaches consumers.
		expect(normalizeDockerText("Authorization: top-secret")).toBe(
			"Authorization: [REDACTED]",
		);
	});

	test("starts the three post-client collectors in parallel", async () => {
		// Break caught: context, engine, and containers run serially after the client gate.
		let callCount = 0;
		let resolveClient: ((value: SafeExecResult) => void) | undefined;
		const client = new Promise<SafeExecResult>((resolve) => {
			resolveClient = resolve;
		});
		const remaining = Array.from({ length: 3 }, () => {
			let resolve: ((value: SafeExecResult) => void) | undefined;
			const promise = new Promise<SafeExecResult>((nextResolve) => {
				resolve = nextResolve;
			});
			return {
				promise,
				resolve(value: SafeExecResult) {
					if (!resolve) throw new Error("missing collector resolver");
					resolve(value);
				},
			};
		});
		const collecting = collectDockerPlugin({
			exec: async () => {
				const index = callCount;
				callCount += 1;
				if (index === 0) return client;
				const next = remaining[index - 1];
				if (!next) throw new Error("unexpected Docker collector call");
				return next.promise;
			},
		});

		await Promise.resolve();
		expect(callCount).toBe(1);
		if (!resolveClient) throw new Error("missing client resolver");
		resolveClient(result("Docker version 28.3.0"));
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(callCount).toBe(4);
		remaining[0]?.resolve(result("default"));
		remaining[1]?.resolve(result("28.3.0\t0\t0\t0\t0\t0"));
		remaining[2]?.resolve(result(""));
		await expect(collecting).resolves.toMatchObject({ status: "completed" });
	});
});
