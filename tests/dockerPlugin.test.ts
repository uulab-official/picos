import { describe, expect, test } from "bun:test";
import {
	collectDockerPlugin,
	normalizeDockerText,
	parseDockerContainerSummaries,
	parseDockerEngineSummary,
} from "../src/core/dockerPlugin";
import type { SafeExecResult } from "../src/core/types";
import {
	collectCredentialBearingDockerSnapshot,
	DOCKER_PLUGIN_CREDENTIAL_FIXTURE_SECRETS,
} from "./support/pluginFixtures";

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

	test("normalizes container-limit edges before publishing bounded rows", async () => {
		// Break caught: NaN or a non-positive/fractional limit bypasses the
		// supported 1..200 integer range or makes the published limit untruthful.
		const containerRows = Array.from(
			{ length: 201 },
			(_, index) =>
				`id-${index}\tcontainer-${index}\timage-${index}\trunning\tUp`,
		).join("\n");
		const cases = [
			{ label: "NaN", input: Number.NaN, expected: 200 },
			{
				label: "positive infinity",
				input: Number.POSITIVE_INFINITY,
				expected: 200,
			},
			{
				label: "negative infinity",
				input: Number.NEGATIVE_INFINITY,
				expected: 1,
			},
			{ label: "negative", input: -12, expected: 1 },
			{ label: "zero", input: 0, expected: 1 },
			{ label: "sub-one fraction", input: 0.75, expected: 1 },
			{ label: "fraction", input: 3.9, expected: 3 },
		] as const;

		for (const { label, input, expected } of cases) {
			const snapshot = await collectDockerPlugin({
				containerLimit: input,
				exec: sequenceExec([
					result("Docker version 28.3.0"),
					result("default"),
					result("28.3.0\t201\t201\t0\t0\t1"),
					result(containerRows),
				]),
			});

			expect(snapshot.data.requestedContainerLimit, label).toBe(expected);
			expect(snapshot.data.returnedContainerCount, label).toBe(expected);
			expect(snapshot.data.containers.length, label).toBe(expected);
			expect(
				Number.isSafeInteger(snapshot.data.requestedContainerLimit),
				label,
			).toBe(true);
			expect(snapshot.data.requestedContainerLimit, label).toBeLessThanOrEqual(
				200,
			);
		}
	});

	test("normalizes direct container parser limits before returning rows", () => {
		// Break caught: the exported parser bypasses the same 200-row publication
		// cap when a direct caller supplies NaN or another unsupported limit.
		const containerRows = Array.from(
			{ length: 201 },
			(_, index) =>
				`id-${index}\tcontainer-${index}\timage-${index}\trunning\tUp`,
		).join("\n");

		expect(
			parseDockerContainerSummaries(containerRows, Number.NaN),
		).toHaveLength(200);
		expect(
			parseDockerContainerSummaries(containerRows, Number.NEGATIVE_INFINITY),
		).toHaveLength(1);
		expect(parseDockerContainerSummaries(containerRows, 0)).toHaveLength(1);
		expect(parseDockerContainerSummaries(containerRows, 3.9)).toHaveLength(3);
	});

	test("publishes the normalized requested limit when Docker is unsupported", async () => {
		// Break caught: unsupported snapshots report the default limit instead of
		// the normalized limit that the caller requested.
		const unsupported = await collectDockerPlugin({
			containerLimit: 3.9,
			exec: sequenceExec([failed("spawn docker ENOENT")]),
		});

		expect(unsupported).toMatchObject({
			status: "unsupported",
			data: { requestedContainerLimit: 3 },
		});

		const partial = await collectDockerPlugin({
			containerLimit: 3.9,
			exec: sequenceExec([
				result("Docker version 28.3.0"),
				result("default"),
				failed("daemon unavailable"),
				failed("daemon unavailable"),
			]),
		});
		expect(partial).toMatchObject({
			status: "partial",
			data: { requestedContainerLimit: 3 },
		});
	});

	test("normalizes timeout edges before invoking Docker plans", async () => {
		// Break caught: invalid timeout values reach safeExec instead of the
		// supported 1..5000 millisecond integer range.
		const cases = [
			{ label: "NaN", input: Number.NaN, expected: 5_000 },
			{
				label: "positive infinity",
				input: Number.POSITIVE_INFINITY,
				expected: 5_000,
			},
			{
				label: "negative infinity",
				input: Number.NEGATIVE_INFINITY,
				expected: 1,
			},
			{ label: "negative", input: -5, expected: 1 },
			{ label: "zero", input: 0, expected: 1 },
			{ label: "sub-one fraction", input: 0.75, expected: 1 },
			{ label: "fraction", input: 2_500.9, expected: 2_500 },
			{ label: "over maximum", input: 6_000, expected: 5_000 },
		] as const;

		for (const { label, input, expected } of cases) {
			const observed: number[] = [];
			const responses = [
				result("Docker version 28.3.0"),
				result("default"),
				result("28.3.0\t0\t0\t0\t0\t0"),
				result(""),
			];
			await collectDockerPlugin({
				timeoutMs: input,
				exec: async (_command, _args, options) => {
					observed.push(options?.timeoutMs ?? 0);
					const response = responses.shift();
					if (!response) throw new Error("unexpected Docker collector call");
					return response;
				},
			});

			expect(observed, label).toEqual([expected, expected, expected, expected]);
		}
	});

	test("keeps the Docker text bound non-bypassable", () => {
		// Break caught: an infinite caller-provided max length returns unbounded
		// Docker text from the shared core normalizer.
		expect(normalizeDockerText("a".repeat(300), Number.POSITIVE_INFINITY)).toBe(
			`${"a".repeat(253)}...`,
		);
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

	test("marks successful malformed collector output as failed evidence", async () => {
		// Break caught: a parser can reject exit-code-zero output while its evidence
		// still claims success and omits any normalization diagnostic.
		const cases = [
			{
				label: "client",
				expectedDiagnostic: "Docker client output could not be normalized.",
				secret: "client-malformed-secret",
				responses: [
					result("not-a-version password=client-malformed-secret"),
					result("default"),
					result("28.3.0\t0\t0\t0\t0\t0"),
					result(""),
				],
			},
			{
				label: "context",
				expectedDiagnostic: "Docker context output could not be normalized.",
				secret: "",
				responses: [
					result("Docker version 28.3.0"),
					result("  \n\t"),
					result("28.3.0\t0\t0\t0\t0\t0"),
					result(""),
				],
			},
			{
				label: "engine",
				expectedDiagnostic: "Docker engine output could not be normalized.",
				secret: "engine-malformed-secret",
				responses: [
					result("Docker version 28.3.0"),
					result("default"),
					result("28.3.0\tpassword=engine-malformed-secret\t0\t0\t0\t1"),
					result(""),
				],
			},
			{
				label: "containers",
				expectedDiagnostic: "Docker containers output could not be normalized.",
				secret: "containers-malformed-secret",
				responses: [
					result("Docker version 28.3.0"),
					result("default"),
					result("28.3.0\t0\t0\t0\t0\t0"),
					result("bad-row\tpassword=containers-malformed-secret"),
				],
			},
		] as const;

		for (const testCase of cases) {
			const snapshot = await collectDockerPlugin({
				exec: sequenceExec([...testCase.responses]),
			});
			const evidence = snapshot.evidence.find(
				(item) => item.id === testCase.label,
			);

			expect(snapshot.status, testCase.label).toBe("partial");
			expect(evidence, testCase.label).toMatchObject({
				id: testCase.label,
				success: false,
				exitCode: 0,
				truncated: false,
				diagnostic: testCase.expectedDiagnostic,
			});
			if (testCase.secret) {
				expect(JSON.stringify(snapshot), testCase.label).not.toContain(
					testCase.secret,
				);
			}
		}
	});

	test("treats an empty successful Docker container listing as valid", async () => {
		// Break caught: the valid empty output from `docker ps` is mislabeled as a
		// normalization failure.
		const snapshot = await collectDockerPlugin({
			exec: sequenceExec([
				result("Docker version 28.3.0"),
				result("default"),
				result("28.3.0\t0\t0\t0\t0\t0"),
				result(""),
			]),
		});
		const evidence = snapshot.evidence.find((item) => item.id === "containers");

		expect(snapshot).toMatchObject({
			status: "completed",
			data: { returnedContainerCount: 0, containers: [] },
		});
		expect(evidence).toMatchObject({ success: true, exitCode: 0 });
		expect(evidence).not.toHaveProperty("diagnostic");
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

	test("redacts credential-bearing Docker values at the core snapshot boundary", async () => {
		// Break caught: URL userinfo/query credentials, assignment/header token
		// shapes, or operator home paths survive into the shared core snapshot.
		const snapshot = await collectCredentialBearingDockerSnapshot();
		const published = JSON.stringify(snapshot);

		expect(snapshot).toMatchObject({
			status: "completed",
			data: {
				clientVersion:
					"ssh://client-user:[REDACTED]@docker.example?access_token=[REDACTED]",
				context:
					"ssh://context-user:[REDACTED]@docker.example/context?token=[REDACTED]&safe=1",
				engineVersion:
					"https://engine-user:[REDACTED]@docker.example?api_key=[REDACTED]",
				containers: [
					{
						id: "Authorization: [REDACTED]",
						names: "password=[REDACTED]",
						image: "registry.example/image?api-key=[REDACTED]",
						state: "X-API-Key: [REDACTED]",
						status: "token: [REDACTED] $HOME/.docker/config.json",
					},
				],
			},
		});
		for (const secret of DOCKER_PLUGIN_CREDENTIAL_FIXTURE_SECRETS) {
			expect(published).not.toContain(secret);
		}
		for (const value of [
			snapshot.data.clientVersion,
			snapshot.data.context,
			snapshot.data.engineVersion,
			...snapshot.data.containers.flatMap((container) => [
				container.id,
				container.names,
				container.image,
				container.state,
				container.status,
			]),
		]) {
			expect(value?.length ?? 0).toBeLessThanOrEqual(256);
		}
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
