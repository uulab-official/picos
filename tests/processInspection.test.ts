import { describe, expect, test } from "bun:test";
import {
	beginProcessInspection,
	isStaleProcessInspection,
} from "../src/tui/processInspection";

describe("process inspection sequence", () => {
	test("lets only the newest request write", () => {
		const first = beginProcessInspection(0);

		expect(isStaleProcessInspection(first, first)).toBeFalse();

		// A second request starts while the first is still awaiting its collector.
		const second = beginProcessInspection(first);

		// The defect this guards: the slower request used to win, so the workspace
		// could show one process's detail beside another's open files.
		expect(isStaleProcessInspection(second, first)).toBeTrue();
		expect(isStaleProcessInspection(second, second)).toBeFalse();
	});

	test("shares one sequence across both writers", () => {
		// The two callbacks that write this state must not hold separate counters,
		// or each would consider itself current while overwriting the other.
		const endpointRequest = beginProcessInspection(0);
		const evidenceRequest = beginProcessInspection(endpointRequest);

		expect(endpointRequest).not.toBe(evidenceRequest);
		expect(
			isStaleProcessInspection(evidenceRequest, endpointRequest),
		).toBeTrue();
		expect(
			isStaleProcessInspection(evidenceRequest, evidenceRequest),
		).toBeFalse();
	});
});
