import { describe, expect, test } from "bun:test";
import {
	createConfigCleanupPreview,
	submitConfigCleanupConfirmation,
} from "../src/core/configCleanup";

describe("config cleanup confirmation", () => {
	test("creates reusable exact-confirm previews for config cleanup operations", () => {
		expect(
			createConfigCleanupPreview({
				id: "tools.targets.tools.dns",
				label: "Tools target presets",
				scope: "tools.dns",
				count: 2,
				verb: "delete",
			}),
		).toEqual({
			id: "tools.targets.tools.dns",
			label: "Tools target presets",
			scope: "tools.dns",
			count: 2,
			verb: "delete",
			confirmationPhrase: "delete tools.dns",
			rows: [
				"CONFIG CLEANUP",
				"target=Tools target presets",
				"scope=tools.dns count=2",
				"confirm delete tools.dns locked",
			],
		});
	});

	test("submits exact config cleanup confirmations without executing cleanup work", () => {
		const preview = createConfigCleanupPreview({
			id: "logs.search",
			label: "Log search presets",
			scope: "logs",
			count: 4,
			verb: "clear",
		});

		expect(submitConfigCleanupConfirmation(preview, "clear log")).toEqual({
			confirmed: false,
			message: "config cleanup rejected logs.search",
			preview,
		});
		expect(submitConfigCleanupConfirmation(preview, " clear logs ")).toEqual({
			confirmed: true,
			message: "config cleanup confirmed logs.search (4 items)",
			preview,
		});
	});
});
