import { describe, expect, test } from "bun:test";
import { getActionCatalog } from "../src/core/actions";
import {
	beginActionRunEffectRequest,
	classifyActionRunOutcome,
	getActionRunEffect,
	getActionRunEffectRequestToken,
	getInterfaceProposalInput,
	prepareRawToolHistoryView,
} from "../src/tui/actionRunTransitions";
import type { ToolHistoryItem } from "../src/tui/toolHistory";

const history: ToolHistoryItem[] = [
	{
		id: "first",
		time: "12:00:00",
		status: "ok",
		label: "DNS example.com",
		plan: {
			actionId: "tools.dns",
			toolId: "dns",
			label: "DNS example.com",
			args: ["example.com"],
		},
		title: "DNS",
		summary: "ok",
		rawOutput: "example.com A 192.0.2.1",
	},
];

describe("read action run transitions", () => {
	test("maps every enabled read action to one tested execution effect", () => {
		for (const action of getActionCatalog()) {
			if (action.risk !== "read" || !action.enabled) continue;
			expect(getActionRunEffect(action.id)).toBeDefined();
		}
	});

	test("owns latest Tools history selection and empty notices", () => {
		expect(prepareRawToolHistoryView([])).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "raw.view has no tool history yet" },
		});
		expect(prepareRawToolHistoryView(history)).toEqual({
			kind: "view",
			screen: "tools",
			selectedIndex: 0,
			notice: { level: "info", message: "raw.view latest DNS example.com" },
		});
	});

	test("owns interface proposal input mapping", () => {
		expect(getInterfaceProposalInput("interface.proposal.disable")).toBe("D");
		expect(getInterfaceProposalInput("interface.proposal.enable")).toBe("U");
		expect(getInterfaceProposalInput("system.inventory")).toBeUndefined();
	});

	test("suppresses stale current state but preserves failure history", () => {
		expect(
			classifyActionRunOutcome({
				actionId: "logs.read",
				currentToken: 2,
				requestToken: 1,
				outcome: {
					kind: "success",
					summary: { kind: "logs", count: 4, status: "ok" },
				},
			}),
		).toEqual({
			publication: "stale",
			publishCurrent: false,
			notices: [
				{ level: "info", message: "logs.read completed publication=stale" },
			],
		});

		expect(
			classifyActionRunOutcome({
				actionId: "logs.read",
				currentToken: 2,
				requestToken: 1,
				outcome: { kind: "failure", error: new Error("collector timeout") },
			}),
		).toEqual({
			publication: "stale",
			publishCurrent: false,
			notices: [
				{
					level: "fail",
					message: "logs.read failed collector timeout publication=stale",
				},
			],
		});
	});

	test("sequences each read effect independently", () => {
		const logs = beginActionRunEffectRequest(new Map(), "logs-read");
		const inventory = beginActionRunEffectRequest(
			logs.tokens,
			"system-inventory",
		);
		const nextLogs = beginActionRunEffectRequest(inventory.tokens, "logs-read");

		expect(logs.requestToken).toBe(1);
		expect(inventory.requestToken).toBe(1);
		expect(nextLogs.requestToken).toBe(2);
		expect(
			getActionRunEffectRequestToken(nextLogs.tokens, "system-inventory"),
		).toBe(1);
	});

	test("formats current collector outcomes outside App", () => {
		expect(
			classifyActionRunOutcome({
				actionId: "logs.read",
				currentToken: 3,
				requestToken: 3,
				outcome: {
					kind: "success",
					summary: { kind: "logs", count: 7, status: "partial" },
				},
			}),
		).toEqual({
			publication: "current",
			publishCurrent: true,
			notices: [{ level: "warn", message: "logs read 7" }],
		});
	});
});
