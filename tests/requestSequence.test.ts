import { describe, expect, test } from "bun:test";
import {
	beginRequest,
	classifyRequestPublication,
	isStaleRequest,
} from "../src/tui/requestSequence";

describe("request sequence", () => {
	test("lets only the newest request write", () => {
		const first = beginRequest(0);

		expect(isStaleRequest(first, first)).toBeFalse();

		// A second request starts while the first is still awaiting its collector.
		const second = beginRequest(first);

		// The defect this guards, seen twice: the slower request used to win, so a
		// workspace could show one process's detail beside another's open files, and
		// a late network refresh could overwrite a newer one.
		expect(isStaleRequest(second, first)).toBeTrue();
		expect(isStaleRequest(second, second)).toBeFalse();
	});

	test("keeps writers of one state group on a single sequence", () => {
		// Two callbacks writing the same state must not hold separate counters, or
		// each would consider itself current while overwriting the other.
		const endpointRequest = beginRequest(0);
		const evidenceRequest = beginRequest(endpointRequest);

		expect(endpointRequest).not.toBe(evidenceRequest);
		expect(isStaleRequest(evidenceRequest, endpointRequest)).toBeTrue();
		expect(isStaleRequest(evidenceRequest, evidenceRequest)).toBeFalse();
	});

	test("keeps unrelated state groups on separate sequences", () => {
		// Groups are independent on purpose: a slow inspection must not discard a
		// fresh refresh, so each group counts from its own starting point.
		const inspection = beginRequest(0);
		const refresh = beginRequest(0);

		expect(isStaleRequest(inspection, inspection)).toBeFalse();
		expect(isStaleRequest(refresh, refresh)).toBeFalse();
	});

	test("classifies both stale success and stale failure as non-publishable", () => {
		const loadToken = beginRequest(0);
		const newerLoadToken = beginRequest(loadToken);

		expect(classifyRequestPublication(newerLoadToken, loadToken)).toBe("stale");
		expect(classifyRequestPublication(newerLoadToken, newerLoadToken)).toBe(
			"current",
		);

		const previewToken = beginRequest(0);
		expect(classifyRequestPublication(previewToken, previewToken)).toBe(
			"current",
		);
	});
});
