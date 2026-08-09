import { describe, expect, test } from "bun:test";
import type { StatusWorkspaceCommand } from "../src/tui/appInputDispatcher";
import {
	formatStatusAuditWriteFailure,
	formatStatusAuditWriteSuccess,
	formatStatusCleanupHistoryWriteFailure,
	formatStatusCleanupHistoryWriteSuccess,
	formatStatusConfigWriteFailure,
	formatStatusHandoffArchiveFailure,
	formatStatusHandoffArchiveResult,
	prepareStatusWorkspaceInput,
	type StatusWorkspaceInputState,
} from "../src/tui/statusInputTransitions";

const allStatusCommands = {
	"cycle-evidence-filter": true,
	"cycle-update-link": true,
	"move-activity-previous": true,
	"move-activity-next": true,
	"move-result-history-previous": true,
	"move-result-history-next": true,
	"filter-or-interface-search": true,
	"cycle-result-timeline-filter": true,
	"move-copy-preview-row": true,
	"toggle-copy-preview": true,
	"open-interface-or-result-timeline": true,
	"copy-result": true,
	"move-copy-intent-previous": true,
	"move-copy-intent-next": true,
	"save-interface-preset-or-move-audit-jump": true,
	"select-remote-known-hosts-handoff": true,
	"select-result-timeline-jump": true,
	"jump-copy-intent-timeline": true,
	"jump-evidence-search": true,
	"open-tools-or-replay-warning": true,
	"cycle-interface-preset-or-search-trail": true,
	"select-timeline-trail-export": true,
	"cycle-timeline-trail-source": true,
	"select-process-export": true,
	"replay-copy-intent": true,
	"export-copy-intent": true,
	"open-last-copy-export": true,
	"open-timeline-trail-export": true,
	"focus-last-copy-export": true,
	"number-evidence-focus": true,
	"move-evidence-previous": true,
	"move-evidence-next": true,
	"cycle-evidence-focus": true,
	"move-cleanup-next": true,
	"move-cleanup-previous": true,
	"reopen-cleanup-or-open-remote-export": true,
	"export-cleanup-history": true,
	"enter-activity": true,
	"archive-evidence": true,
	"preview-retention": true,
	"refresh-cleanup": true,
	"refresh-audit": true,
	"refresh-audit-archive": true,
	"refresh-cleanup-archive": true,
	"open-tools-archive": true,
	"move-cleanup-export": true,
	"move-audit-export": true,
	"move-audit-archive": true,
	"move-cleanup-archive": true,
	"open-cleanup-export": true,
	"open-audit-export": true,
	"preview-selected-retention": true,
	"archive-selected-audit": true,
	"archive-selected-cleanup": true,
	"open-handoff": true,
	"archive-handoff-or-interface": true,
	"copy-update-link": true,
	"open-update-link": true,
} as const satisfies Record<StatusWorkspaceCommand, true>;

const result = {
	source: "cleanup" as const,
	action: "jump-cleanup" as const,
	message: "cleanup activity selected",
	detail: "cleanup handoff Routes",
};

const copyIntent = {
	label: "status activity cleanup jump-cleanup",
	copyText: "cleanup jump-cleanup\ncleanup activity selected",
	selectedRow: 1,
	expanded: false,
	lines: 2,
	preview: "cleanup jump-cleanup",
	auditMessage: "clipboard intent status-activity test",
};

type StatusStateOverrides = Omit<
	Partial<StatusWorkspaceInputState>,
	"activity" | "cleanup" | "dialogs" | "evidence" | "updates"
> & {
	updates?: Partial<StatusWorkspaceInputState["updates"]>;
	activity?: Partial<StatusWorkspaceInputState["activity"]>;
	evidence?: Omit<
		Partial<StatusWorkspaceInputState["evidence"]>,
		"indexes" | "selection"
	> & {
		indexes?: Partial<StatusWorkspaceInputState["evidence"]["indexes"]>;
		selection?: Partial<StatusWorkspaceInputState["evidence"]["selection"]>;
	};
	cleanup?: Partial<StatusWorkspaceInputState["cleanup"]>;
	dialogs?: Partial<StatusWorkspaceInputState["dialogs"]>;
};

function createState(
	overrides: StatusStateOverrides = {},
): StatusWorkspaceInputState {
	const base: StatusWorkspaceInputState = {
		baseDir: "/tmp/picos",
		platform: "darwin",
		generatedAt: new Date("2026-08-08T01:02:03.000Z"),
		fileOpenOrigin: undefined,
		retentionLimit: 10,
		updates: {
			selectedLinkIndex: 0,
		},
		activity: {
			selectedSource: "release",
			results: [],
			selectedResultIndex: 0,
			resultHistoryFilter: "all",
			resultTimelineJumpFilter: "all",
			selectedCopyPreviewRowIndex: 0,
			copyPreviewExpanded: false,
			copyIntents: [],
			selectedCopyIntentIndex: 0,
			selectedAuditJumpIndex: 0,
			selectedToolsEvidenceMatchIndex: 0,
		},
		evidence: {
			indexes: {
				handoffIndex: { baseDir: "/tmp/picos/handoffs", items: [] },
				auditExportIndex: { baseDir: "/tmp/picos/audit", items: [] },
				auditExportArchiveIndex: {
					baseDir: "/tmp/picos/audit/archive",
					items: [],
				},
				cleanupExportIndex: { baseDir: "/tmp/picos/cleanup", items: [] },
				cleanupExportArchiveIndex: {
					baseDir: "/tmp/picos/cleanup/archive",
					items: [],
				},
				toolExportIndex: { baseDir: "/tmp/picos/tools", items: [] },
				toolExportArchiveIndex: {
					baseDir: "/tmp/picos/tools/archive",
					items: [],
				},
				processControlAuditExports: [],
				remoteKnownHostsSelectionAuditExports: [],
				interfaceConfirmationAuditExports: [],
				interfaceConfirmationAuditArchiveExports: [],
			},
			selection: {
				selectedHandoffIndex: 0,
				selectedAuditExportIndex: 0,
				selectedAuditExportArchiveIndex: 0,
				selectedCleanupExportIndex: 0,
				selectedCleanupExportArchiveIndex: 0,
				selectedToolExportIndex: 0,
				selectedToolExportArchiveIndex: 0,
				selectedProcessControlAuditExportIndex: 0,
				selectedRemoteKnownHostsSelectionAuditExportIndex: 0,
				selectedInterfaceConfirmationAuditExportIndex: 0,
				toolExportFilter: "any",
				toolExportArchiveFilter: "any",
				toolExportQuery: "",
				toolExportArchiveQuery: "",
				interfaceEvidenceStateFilter: "all",
				interfaceEvidenceQuery: "",
			},
			selectedKind: "handoff",
		},
		cleanup: {
			index: { activeShelves: 0, totalItems: 0, shelves: [] },
			selectedShelfIndex: 0,
			history: [],
		},
		dialogs: {
			externalOpen: false,
			fileOpen: false,
			auditExportArchive: false,
			auditArchiveRetention: false,
			cleanupExportArchive: false,
			toolExportArchive: false,
			toolArchiveRetention: false,
		},
		configManagedShelfRows: [],
		events: [],
	};
	return {
		...base,
		...overrides,
		updates: { ...base.updates, ...overrides.updates },
		activity: { ...base.activity, ...overrides.activity },
		evidence: {
			...base.evidence,
			...overrides.evidence,
			indexes: {
				...base.evidence.indexes,
				...overrides.evidence?.indexes,
			},
			selection: {
				...base.evidence.selection,
				...overrides.evidence?.selection,
			},
		},
		cleanup: { ...base.cleanup, ...overrides.cleanup },
		dialogs: { ...base.dialogs, ...overrides.dialogs },
	};
}

function prepare(
	command: StatusWorkspaceCommand | undefined,
	overrides: StatusStateOverrides = {},
	inputDigit = "",
) {
	return prepareStatusWorkspaceInput({
		command,
		inputDigit,
		state: command ? createState(overrides) : undefined,
	});
}

const handoffItem = {
	source: "route-handoff" as const,
	kind: "routes" as const,
	view: "table",
	label: "default route",
	command: "picos routes",
	generatedAt: "2026-08-08T00:00:00.000Z",
	path: "/tmp/picos/handoffs/route.md",
};

const auditItem = {
	fileName: "picos-audit-selected.log",
	path: "/tmp/picos/audit/picos-audit-selected.log",
	generatedAt: "2026-08-08T00:00:00.000Z",
	scope: "selected" as const,
	query: "control",
	entryCount: 1,
};

const cleanupItem = {
	fileName: "picos-cleanup-selected.md",
	path: "/tmp/picos/cleanup/picos-cleanup-selected.md",
	generatedAt: "2026-08-08T00:00:00.000Z",
	scope: "selected" as const,
	entryCount: 2,
};

const toolItem = {
	fileName: "picos-tools-selected.md",
	path: "/tmp/picos/tools/picos-tools-selected.md",
	generatedAt: "2026-08-08T00:00:00.000Z",
	scope: "selected" as const,
	runCount: 3,
};

const processPlan = {
	path: "/tmp/picos/audit/process.log",
	content: "",
	eventCount: 1,
	scope: "selected" as const,
	query: "process control evidence: kill pid=42 node",
};

const remotePlan = {
	path: "/tmp/picos/audit/known-hosts.log",
	content: "",
	eventCount: 2,
	scope: "filtered" as const,
	query: "remote known_hosts selection history prod",
};

const interfacePlan = {
	path: "/tmp/picos/audit/interface.log",
	content: "",
	eventCount: 1,
	scope: "selected" as const,
	query: "interface confirmation interface.disable status=confirmed-blocked",
};

const cleanupShelf = {
	id: "routes" as const,
	label: "Routes presets",
	count: 2,
	screen: "routes" as const,
	workspace: "Routes",
	shortcut: "D",
	confirmationPhrase: "clear route filters",
	detail: "saved route filters",
};

function evidenceFamilyState(
	kind: StatusWorkspaceInputState["evidence"]["selectedKind"],
	options: { archivedInterface?: boolean; duplicate?: boolean } = {},
): StatusStateOverrides {
	const duplicate = options.duplicate;
	const indexes: Partial<StatusWorkspaceInputState["evidence"]["indexes"]> =
		switchEvidenceIndexes(kind, options.archivedInterface, duplicate);
	return {
		activity: { selectedSource: "evidence" },
		evidence: { selectedKind: kind, indexes },
	};
}

function switchEvidenceIndexes(
	kind: StatusWorkspaceInputState["evidence"]["selectedKind"],
	archivedInterface = false,
	duplicate = false,
): Partial<StatusWorkspaceInputState["evidence"]["indexes"]> {
	const twice = <Item>(item: Item): Item[] =>
		duplicate ? [item, { ...item }] : [item];
	switch (kind) {
		case "handoff":
			return {
				handoffIndex: { baseDir: "/tmp", items: twice(handoffItem) },
			};
		case "audit":
			return {
				auditExportIndex: { baseDir: "/tmp", items: twice(auditItem) },
			};
		case "audit-archive":
			return {
				auditExportArchiveIndex: {
					baseDir: "/tmp",
					items: twice(auditItem),
				},
			};
		case "cleanup":
			return {
				cleanupExportIndex: { baseDir: "/tmp", items: twice(cleanupItem) },
			};
		case "cleanup-archive":
			return {
				cleanupExportArchiveIndex: {
					baseDir: "/tmp",
					items: twice(cleanupItem),
				},
			};
		case "tools":
			return {
				toolExportIndex: { baseDir: "/tmp", items: twice(toolItem) },
			};
		case "tools-archive":
			return {
				toolExportArchiveIndex: { baseDir: "/tmp", items: twice(toolItem) },
			};
		case "process":
			return { processControlAuditExports: twice(processPlan) };
		case "remote-known-hosts":
			return { remoteKnownHostsSelectionAuditExports: twice(remotePlan) };
		case "interface":
			return archivedInterface
				? {
						interfaceConfirmationAuditArchiveExports: twice(interfacePlan),
					}
				: { interfaceConfirmationAuditExports: twice(interfacePlan) };
	}
}

describe("Status workspace input ownership", () => {
	test("leaves input without a Status command unhandled", () => {
		expect(prepare(undefined)).toEqual({ kind: "unhandled" });
	});

	test("handles every StatusWorkspaceCommand", () => {
		for (const command of Object.keys(
			allStatusCommands,
		) as StatusWorkspaceCommand[]) {
			const transition = prepare(command);
			expect(transition.kind).toBe("handled");
			if (transition.kind === "handled") {
				expect(transition.effects.length).toBeGreaterThan(0);
				expect(
					transition.effects.some((effect) => "invocation" in effect),
				).toBe(false);
			}
		}
	});

	test("returns complete refresh snapshots and persistence intent", () => {
		expect(prepare("cycle-result-timeline-filter")).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						statusActivityResultTimelineJumpFilter: "process",
						selectedStatusActivityResultIndex: 0,
					},
				},
				{
					kind: "notice",
					notice: {
						message: "status activity timeline result jump filter process",
					},
				},
				{
					kind: "config-write",
					key: "statusResultJumpClassFilter",
					value: "process",
				},
			],
		});
		for (const [command, target] of [
			["refresh-cleanup", "cleanup"],
			["refresh-audit", "audit"],
			["refresh-audit-archive", "audit-archive"],
			["refresh-cleanup-archive", "cleanup-archive"],
		] as const) {
			expect(prepare(command)).toMatchObject({
				kind: "handled",
				effects: [
					{
						kind: "refresh-index",
						target,
						baseDir: "/tmp/picos",
						announce: true,
						snapshot: {
							selectedIndex: 0,
							interfaceEvidenceStateFilter: "all",
							interfaceEvidenceQuery: "",
						},
					},
				],
			});
		}
	});

	test("resolves evidence-filter and search fallbacks into state and prompt effects", () => {
		expect(
			prepare("cycle-evidence-filter", {
				evidence: { selectedKind: "interface" },
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						interfaceEvidenceStateFilter: "active",
						selectedStatusEvidenceKind: "interface",
					},
				},
				{ kind: "notice" },
				{ kind: "record-activity" },
			],
		});
		expect(prepare("cycle-evidence-filter")).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { toolExportFilter: "selected" },
				},
				{ kind: "notice" },
			],
		});
		expect(
			prepare("filter-or-interface-search", {
				evidence: { selectedKind: "interface" },
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { selectedStatusEvidenceKind: "interface" },
				},
				{
					kind: "command-prompt",
					prompt: "interface-evidence-search",
					value: "",
				},
				{ kind: "notice" },
			],
		});
		expect(prepare("filter-or-interface-search")).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						statusActivityResultHistoryFilter: "palette-result-jumps",
					},
				},
				{ kind: "notice" },
			],
		});
	});

	test("reports an empty update handoff and cycles a populated handoff exactly", () => {
		expect(prepare("cycle-update-link")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: { level: "warn", message: "no update handoff links" },
				},
			],
		});

		expect(
			prepare("cycle-update-link", {
				updates: {
					selectedLinkIndex: 0,
					packageResult: {
						packageName: "@uulab/picos",
						currentVersion: "0.4.0",
						latestVersion: "0.5.0",
						status: "update-available",
						registryUrl: "https://registry.npmjs.org/@uulab/picos",
					},
				},
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { selectedUpdateHandoffIndex: 1 },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "update handoff selected GitHub Release",
					},
				},
			],
		});
	});

	test("moves only across available Status activity sources", () => {
		expect(
			prepare("move-activity-next", {
				activity: { selectedSource: "release" },
				updates: {
					selectedLinkIndex: 0,
					githubResult: {
						owner: "uulab-official",
						repo: "picos",
						currentVersion: "0.4.0",
						status: "up-to-date",
						apiUrl:
							"https://api.github.com/repos/uulab-official/picos/releases/latest",
					},
				},
				dialogs: { fileOpen: true },
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { selectedStatusActivitySource: "dialog" },
				},
				{
					kind: "notice",
					notice: { level: "info", message: "status activity focus dialog" },
				},
			],
		});
	});

	test("preserves exact empty and populated result-history transitions", () => {
		expect(prepare("move-result-history-next")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no status activity result history",
					},
				},
			],
		});
		expect(
			prepare("move-result-history-next", {
				activity: {
					results: [result],
					selectedResultIndex: 7,
					resultHistoryFilter: "all",
				},
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						selectedStatusActivityResultIndex: 0,
						selectedStatusActivityCopyPreviewRowIndex: 0,
						statusActivityCopyPreviewExpanded: false,
					},
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message:
							"status activity history 1/1 filter=all cleanup jump-cleanup",
					},
				},
			],
		});
	});

	test("owns copy preview movement, expansion, history payload, and clipboard intent", () => {
		expect(prepare("move-copy-preview-row")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no status activity copy preview rows",
					},
				},
			],
		});
		expect(
			prepare("toggle-copy-preview", {
				activity: { results: [result], copyPreviewExpanded: false },
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { statusActivityCopyPreviewExpanded: true },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "status activity copy preview expanded=true",
					},
				},
			],
		});

		const transition = prepare("copy-result", {
			activity: {
				results: [result],
				selectedCopyPreviewRowIndex: 2,
				copyPreviewExpanded: true,
			},
		});
		expect(transition.kind).toBe("handled");
		if (transition.kind !== "handled") return;
		expect(transition.effects).toHaveLength(3);
		expect(transition.effects[0]).toMatchObject({
			kind: "state",
			patch: {
				selectedStatusActivityCopyIntentIndex: 0,
				statusActivityCopyIntentHistory: [
					{
						label: "status activity cleanup jump-cleanup",
						selectedRow: 3,
						expanded: true,
					},
				],
			},
		});
		expect(transition.effects[1]).toMatchObject({
			kind: "notice",
			notice: {
				level: "info",
				message:
					'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=3 expanded=true lines=3 preview="cleanup jump-cleanup"',
			},
		});
		expect(transition.effects[2]).toMatchObject({
			kind: "clipboard-confirmation",
			preview: {
				source: "status-activity",
				label: "status activity cleanup jump-cleanup",
			},
		});
	});

	test("resolves result-copy fallback with the selected remote known_hosts plan", () => {
		expect(prepare("copy-result")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no remote known_hosts evidence handoff to copy",
					},
				},
			],
		});
		expect(
			prepare("copy-result", {
				evidence: {
					indexes: {
						remoteKnownHostsSelectionAuditExports: [remotePlan],
					},
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						selectedStatusEvidenceKind: "remote-known-hosts",
						selectedStatusActivityCopyIntentIndex: 0,
						screen: "status",
						focusArea: "workspaces",
					},
				},
				{
					kind: "notice",
					notice: { level: "info" },
				},
				{
					kind: "clipboard-confirmation",
					preview: {
						source: "status-activity",
					},
				},
			],
		});
	});

	test("moves and replays copy intent history without rereading it in App", () => {
		expect(prepare("move-copy-intent-next")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: { level: "warn", message: "no status activity copy intents" },
				},
			],
		});
		expect(
			prepare("move-copy-intent-next", {
				activity: {
					copyIntents: [copyIntent, { ...copyIntent, label: "second" }],
					selectedCopyIntentIndex: 0,
				},
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { selectedStatusActivityCopyIntentIndex: 1 },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "status activity copy intent 2/2 second",
					},
				},
			],
		});
		const replay = prepare("replay-copy-intent", {
			activity: { copyIntents: [copyIntent] },
		});
		expect(replay).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "info",
						message:
							"status activity copy intent replay status activity cleanup jump-cleanup",
					},
				},
				{
					kind: "clipboard-confirmation",
					preview: { label: "status activity cleanup jump-cleanup" },
				},
			],
		});
	});

	test("resolves the interface-result timeline fallback before returning effects", () => {
		const interfaceResult = {
			source: "evidence" as const,
			action: "interface-evidence-find" as const,
			message: "interface evidence find",
		};
		expect(
			prepare("open-interface-or-result-timeline", {
				activity: { results: [interfaceResult] },
				evidence: {
					selectedKind: "interface",
					indexes: { interfaceConfirmationAuditExports: [interfacePlan] },
				},
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message:
							"status activity result audit jump warning no status activity result audit jump",
					},
				},
			],
		});
		expect(
			prepare("open-interface-or-result-timeline", {
				activity: { results: [result] },
				evidence: {
					selectedKind: "interface",
					indexes: { interfaceConfirmationAuditExports: [interfacePlan] },
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						selectedInterfaceConfirmationAuditExportIndex: 0,
						selectedStatusEvidenceKind: "interface",
					},
				},
				{
					kind: "notice",
					notice: {
						message: `interface confirmation evidence export open confirmation opened for ${interfacePlan.path}`,
					},
				},
				{
					kind: "open-file-confirmation",
					plan: { path: interfacePlan.path },
				},
			],
		});
	});

	test("owns interface preset persistence and audit-jump movement", () => {
		expect(
			prepare("save-interface-preset-or-move-audit-jump", {
				evidence: { selectedKind: "interface" },
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no interface evidence query to save",
					},
				},
			],
		});
		expect(
			prepare("save-interface-preset-or-move-audit-jump", {
				evidence: {
					selectedKind: "interface",
					selection: { interfaceEvidenceQuery: "status=blocked" },
					interfaceEvidenceSearchPresets: ["target=Wi-Fi"],
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						interfaceEvidenceSearchPresets: ["status=blocked", "target=wi-fi"],
					},
				},
				{
					kind: "config-write",
					key: "interfaceEvidenceSearchPresets",
					value: ["status=blocked", "target=wi-fi"],
				},
				{ kind: "notice" },
			],
		});
		expect(prepare("save-interface-preset-or-move-audit-jump")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no status activity result audit jumps",
					},
				},
			],
		});
		const auditJump = {
			...copyIntent,
			label: "status activity result audit jump 1",
		};
		expect(
			prepare("save-interface-preset-or-move-audit-jump", {
				activity: {
					copyIntents: [
						auditJump,
						{ ...auditJump, label: `${auditJump.label}b` },
					],
					selectedAuditJumpIndex: 0,
				},
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { selectedStatusActivityResultAuditJumpIndex: 1 },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "status activity result audit jump 2/2",
					},
				},
			],
		});
	});

	test("returns complete timeline state for copy-intent and evidence-focus jumps", () => {
		expect(prepare("jump-copy-intent-timeline")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no status activity copy intent for timeline",
					},
				},
			],
		});
		expect(
			prepare("jump-copy-intent-timeline", {
				activity: { copyIntents: [copyIntent] },
				events: [
					{
						id: "1",
						level: "info",
						message: "clipboard status activity cleanup jump-cleanup copied",
						time: "01:00:00",
					},
				],
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "timeline-jump",
					screen: "timeline",
					transition: {
						filter: "audit",
						query: "status activity cleanup jump-cleanup",
						matches: 1,
						selectedIndex: 0,
						notice: {
							level: "info",
							message:
								"status activity copy intent timeline search status activity cleanup jump-cleanup matches 1",
						},
					},
				},
			],
		});
		expect(
			prepare("jump-evidence-search", {
				activity: {
					lastEvidenceFocusPlan: {
						kind: "audit",
						selectedIndex: 0,
						itemCount: 1,
						shortcut: "w",
						label: "picos-audit-selected.log",
						path: auditItem.path,
						message: "focused",
					},
				},
				events: [],
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "timeline-jump",
					screen: "timeline",
					transition: {
						filter: "audit",
						query: "status activity evidence focus",
						matches: 0,
						selectedIndex: 0,
					},
				},
			],
		});
	});

	test("resolves process, remote known_hosts, and interface evidence searches", () => {
		const cases = [
			{
				kind: "process" as const,
				indexes: { processControlAuditExports: [processPlan] },
				message:
					"status evidence search G process selected events=1 query=process control evidence: kill pid=42 node",
			},
			{
				kind: "remote-known-hosts" as const,
				indexes: { remoteKnownHostsSelectionAuditExports: [remotePlan] },
				message:
					"status evidence search G remote known_hosts filtered events=2 query=remote known_hosts selection history prod",
			},
			{
				kind: "interface" as const,
				indexes: { interfaceConfirmationAuditExports: [interfacePlan] },
				message:
					"status evidence search G interface active selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
			},
		] satisfies Array<{
			kind: StatusWorkspaceInputState["evidence"]["selectedKind"];
			indexes: Partial<StatusWorkspaceInputState["evidence"]["indexes"]>;
			message: string;
		}>;
		for (const item of cases) {
			const transition = prepare("jump-evidence-search", {
				evidence: { selectedKind: item.kind, indexes: item.indexes },
			});
			expect(transition.kind).toBe("handled");
			if (transition.kind !== "handled") continue;
			expect(transition.effects.some((effect) => "invocation" in effect)).toBe(
				false,
			);
			expect(
				transition.effects.find((effect) => effect.kind === "timeline-jump"),
			).toMatchObject({
				kind: "timeline-jump",
				screen: "timeline",
				transition: { filter: "audit", query: expect.any(String) },
			});
			expect(transition.effects.at(-1)).toEqual({
				kind: "notice",
				notice: { level: "info", message: item.message },
			});
		}
	});

	test("owns number focus, item movement, recovery movement, and empty evidence notices", () => {
		expect(prepare("number-evidence-focus", {}, "1")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "status evidence index unavailable 1",
					},
				},
			],
		});
		expect(
			prepare(
				"number-evidence-focus",
				{
					evidence: {
						indexes: {
							handoffIndex: { baseDir: "/tmp", items: [handoffItem] },
						},
					},
				},
				"1",
			),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { selectedStatusEvidenceKind: "handoff" },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message:
							"status evidence focus 1 handoff handoff route routes/table",
					},
				},
			],
		});
		expect(
			prepare("move-evidence-next", {
				evidence: {
					selectedKind: "audit",
					indexes: {
						auditExportIndex: {
							baseDir: "/tmp",
							items: [
								auditItem,
								{
									...auditItem,
									fileName: "second.log",
									path: "/tmp/second.log",
								},
							],
						},
					},
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { selectedAuditExportIndex: 1 },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message:
							"status evidence item ] audit 2/2 audit selected events=1 query=control",
					},
				},
			],
		});
		expect(
			prepare("move-evidence-next", {
				activity: {
					toolsEvidenceRecovery: {
						target: "active",
						query: "dns",
						total: 2,
						items: [toolItem, { ...toolItem, fileName: "second.md" }],
					},
				},
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { selectedStatusActivityToolsEvidenceSearchMatchIndex: 1 },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "tools evidence match selected 2/2 second.md",
					},
				},
			],
		});
	});

	test("enters every Status evidence family with a fully resolved effect", () => {
		const cases = [
			["handoff", "open-handoff", "O", "handoff route routes/table"],
			["audit", "open-audit", "W", "audit selected events=1 query=control"],
			[
				"audit-archive",
				"open-audit-archive",
				"J",
				"audit-archive selected events=1 query=control",
			],
			["cleanup", "open-cleanup", "V", "cleanup selected entries=2"],
			["tools", "open-tools", "K", "tools selected runs=3"],
			[
				"tools-archive",
				"open-tools-archive",
				"K",
				"tools-archive selected runs=3",
			],
			[
				"process",
				"open-process-evidence",
				"F",
				"process selected events=1 query=process control evidence: kill pid=42 node",
			],
			[
				"remote-known-hosts",
				"open-remote-known-hosts-evidence",
				"R",
				"remote known_hosts filtered events=2 query=remote known_hosts selection history prod",
			],
			[
				"interface",
				"open-interface-evidence",
				"I",
				"interface active selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
			],
		] as const;
		for (const [kind, action, shortcut, label] of cases) {
			const transition = prepare("enter-activity", evidenceFamilyState(kind));
			expect(transition.kind).toBe("handled");
			if (transition.kind !== "handled") continue;
			expect(transition.effects.some((effect) => "invocation" in effect)).toBe(
				false,
			);
			expect(
				transition.effects.find(
					(effect) => effect.kind === "open-file-confirmation",
				),
			).toBeDefined();
			expect(transition.effects).toContainEqual({
				kind: "notice",
				notice: {
					level: "info",
					message: `status evidence enter ${action} ${shortcut} ${label}`,
				},
			});
			expect(transition.effects).toContainEqual(
				expect.objectContaining({
					kind: "record-activity",
					result: expect.objectContaining({
						source: "evidence",
						action: "enter-evidence",
						detail: `${action} ${shortcut} ${label}`,
					}),
				}),
			);
		}
	});

	test("resolves selected evidence resources without asking App callbacks to reread state", () => {
		const cases = [
			["handoff", handoffItem.path],
			["audit", auditItem.path],
			["cleanup", cleanupItem.path],
			["tools", toolItem.path],
			["process", processPlan.path],
			["remote-known-hosts", remotePlan.path],
			["interface", interfacePlan.path],
		] as const;
		for (const [kind, path] of cases) {
			const transition = prepare("enter-activity", evidenceFamilyState(kind));
			expect(transition.kind).toBe("handled");
			if (transition.kind !== "handled") continue;
			expect(transition.effects.some((effect) => "invocation" in effect)).toBe(
				false,
			);
			expect(
				transition.effects.find(
					(effect) => effect.kind === "open-file-confirmation",
				),
			).toMatchObject({
				kind: "open-file-confirmation",
				plan: { path },
				prompt: "file-open",
				screen: "status",
			});
		}
	});

	test("enters cleanup-archive evidence as a selection-only activity", () => {
		expect(
			prepare("enter-activity", evidenceFamilyState("cleanup-archive")),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "info",
						message:
							"cleanup archive selected cleanup-archive selected entries=2; use { to cycle archived cleanup exports",
					},
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message:
							"status evidence enter select-cleanup-archive { cleanup-archive selected entries=2",
					},
				},
				{
					kind: "record-activity",
					result: {
						action: "enter-evidence",
						detail:
							"select-cleanup-archive { cleanup-archive selected entries=2",
					},
				},
			],
		});
	});

	test("owns release, dialog, cleanup, config, and empty activity entry", () => {
		const packageResult = {
			packageName: "@uulab/picos",
			currentVersion: "0.4.0",
			latestVersion: "0.5.0",
			status: "update-available" as const,
			registryUrl: "https://registry.npmjs.org/@uulab/picos",
		};
		expect(
			prepare("enter-activity", {
				updates: { packageResult, selectedLinkIndex: 0 },
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{ kind: "state", patch: { selectedUpdateHandoffIndex: 1 } },
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "update handoff selected GitHub Release",
					},
				},
				{
					kind: "record-activity",
					result: { detail: "release handoff link cycled" },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "release activity selected; cycling release handoff link",
					},
				},
			],
		});

		expect(
			prepare("enter-activity", {
				activity: { selectedSource: "dialog" },
				dialogs: { fileOpen: true },
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{ kind: "record-activity", result: { action: "show-dialog" } },
				{
					kind: "notice",
					notice: {
						level: "info",
						message:
							"dialog activity selected; type the exact confirmation phrase",
					},
				},
			],
		});

		expect(
			prepare("enter-activity", {
				activity: { selectedSource: "cleanup" },
				cleanup: {
					index: { activeShelves: 1, totalItems: 2, shelves: [cleanupShelf] },
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						screen: "routes",
						cleanupJumpAudit: { id: "routes", count: 2 },
					},
				},
				{
					kind: "record-activity",
					result: {
						detail:
							"cleanup handoff Routes presets: press D then type clear route filters",
					},
				},
				{
					kind: "notice",
					notice: {
						message:
							"cleanup activity selected; jumping to selected cleanup shelf",
					},
				},
				{
					kind: "notice",
					notice: {
						message:
							"cleanup handoff Routes presets: press D then type clear route filters",
					},
				},
			],
		});

		expect(
			prepare("enter-activity", {
				activity: { selectedSource: "config" },
				configManagedShelfRows: ["CONFIG MANAGED SHELVES"],
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{ kind: "state", patch: { screen: "config", focusArea: "workspaces" } },
				{
					kind: "record-activity",
					result: { detail: "Config recovery hints opened" },
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "config activity selected; opening Config recovery hints",
					},
				},
			],
		});

		expect(prepare("enter-activity")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "record-activity",
					result: {
						source: "release",
						action: "none",
						message: "no Status activity available",
					},
				},
				{
					kind: "notice",
					notice: { level: "warn", message: "no Status activity available" },
				},
			],
		});
	});

	test("cycles evidence focus and cleanup shelves with exact empty handling", () => {
		expect(prepare("cycle-evidence-focus")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: { level: "warn", message: "no status evidence indexed" },
				},
			],
		});
		expect(
			prepare("cycle-evidence-focus", {
				evidence: {
					selectedKind: "handoff",
					indexes: {
						handoffIndex: { baseDir: "/tmp", items: [handoffItem] },
						auditExportIndex: { baseDir: "/tmp", items: [auditItem] },
					},
				},
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{ kind: "state", patch: { selectedStatusEvidenceKind: "audit" } },
				{
					kind: "notice",
					notice: { level: "info", message: "status evidence focus audit" },
				},
			],
		});
		expect(prepare("move-cleanup-next")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no cleanup shelves with saved items",
					},
				},
			],
		});
		expect(
			prepare("move-cleanup-next", {
				cleanup: {
					index: {
						activeShelves: 2,
						totalItems: 3,
						shelves: [
							cleanupShelf,
							{
								...cleanupShelf,
								id: "ports",
								label: "Ports presets",
								screen: "ports",
							},
						],
					},
				},
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{ kind: "state", patch: { selectedCleanupShelfIndex: 1 } },
				{
					kind: "notice",
					notice: {
						level: "info",
						message: "cleanup shelf selected Ports presets",
					},
				},
			],
		});
	});

	test("resolves tools, remote, cleanup, retention, and archive fallback effects", () => {
		const recovery = {
			target: "active" as const,
			query: "dns",
			total: 1,
			items: [toolItem],
		};
		const toolOpen = prepare("open-tools-or-replay-warning", {
			activity: { toolsEvidenceRecovery: recovery },
		});
		expect(toolOpen.kind).toBe("handled");
		if (toolOpen.kind !== "handled") return;
		expect(
			toolOpen.effects.find(
				(effect) => effect.kind === "open-file-confirmation",
			),
		).toMatchObject({
			kind: "open-file-confirmation",
			plan: { path: toolItem.path },
		});
		const toolArchive = prepare("open-tools-archive", {
			activity: { toolsEvidenceRecovery: recovery },
		});
		expect(toolArchive.kind).toBe("handled");
		if (toolArchive.kind !== "handled") return;
		expect(
			toolArchive.effects.find((effect) => effect.kind === "plan-confirmation"),
		).toMatchObject({
			kind: "plan-confirmation",
			prompt: "tool-export-archive",
			plan: { sourcePath: toolItem.path },
		});

		expect(
			prepare("cycle-interface-preset-or-search-trail", {
				evidence: { selectedKind: "interface" },
			}),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no interface evidence search presets",
					},
				},
			],
		});
		const remoteOpen = prepare("reopen-cleanup-or-open-remote-export", {
			evidence: {
				selectedKind: "remote-known-hosts",
				indexes: {
					remoteKnownHostsSelectionAuditExports: [remotePlan],
				},
			},
		});
		expect(remoteOpen.kind).toBe("handled");
		if (remoteOpen.kind !== "handled") return;
		expect(
			remoteOpen.effects.find(
				(effect) => effect.kind === "open-file-confirmation",
			),
		).toMatchObject({
			kind: "open-file-confirmation",
			plan: { path: remotePlan.path },
		});
		expect(
			prepare("reopen-cleanup-or-open-remote-export", {
				cleanup: {
					history: [{ ...cleanupShelf, outcome: "prompt-opened" }],
					selectedHistoryIndex: 0,
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: { cleanupJumpAudit: { id: "routes" }, screen: "routes" },
				},
				{ kind: "notice" },
			],
		});

		for (const transition of [
			toolOpen,
			toolArchive,
			prepare(
				"preview-selected-retention",
				evidenceFamilyState("interface", { archivedInterface: true }),
			),
			prepare("archive-handoff-or-interface", evidenceFamilyState("interface")),
			prepare("archive-handoff-or-interface", evidenceFamilyState("handoff")),
		]) {
			expect(transition.kind).toBe("handled");
			if (transition.kind === "handled") {
				expect(
					transition.effects.some((effect) => "invocation" in effect),
				).toBe(false);
			}
		}
	});

	test("turns the latest stale replay warning into a complete Timeline jump", () => {
		expect(prepare("open-tools-or-replay-warning")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no status activity stale replay warning for timeline",
					},
				},
			],
		});
		const warning =
			"status activity result audit jump warning stale intent fix=P audit jump/new result";
		expect(
			prepare("open-tools-or-replay-warning", {
				events: [
					{ id: "warn", level: "warn", message: warning, time: "01:00:00" },
				],
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "timeline-jump",
					screen: "timeline",
					transition: {
						filter: "audit",
						query: warning,
						matches: 1,
						selectedIndex: 0,
					},
				},
			],
		});
	});

	test("resolves archive and retention actions for every eligible evidence family", () => {
		const archiveCases = [
			["handoff", "archive-handoff", "A", "handoff route routes/table"],
			["audit", "archive-audit", "Z", "audit selected events=1 query=control"],
			["cleanup", "archive-cleanup", "X", "cleanup selected entries=2"],
			["tools", "archive-tools", "D", "tools selected runs=3"],
			[
				"interface",
				"archive-interface-evidence",
				"A",
				"interface active selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
			],
		] as const;
		for (const [kind, action, shortcut, label] of archiveCases) {
			const transition = prepare("archive-evidence", evidenceFamilyState(kind));
			expect(transition.kind).toBe("handled");
			if (transition.kind !== "handled") continue;
			expect(
				transition.effects.some((effect) =>
					kind === "handoff"
						? effect.kind === "handoff-archive" &&
							effect.path === handoffItem.path
						: effect.kind === "plan-confirmation",
				),
			).toBe(true);
			expect(transition.effects.at(-1)).toEqual({
				kind: "notice",
				notice: {
					level: "info",
					message: `status evidence action ${action} ${shortcut} ${label}`,
				},
			});
		}
		const retentionCases = [
			[
				"audit-archive",
				{},
				"preview-audit-retention",
				"audit-archive selected events=1 query=control",
			],
			[
				"tools-archive",
				{},
				"preview-tools-retention",
				"tools-archive selected runs=3",
			],
			[
				"interface",
				{ archivedInterface: true },
				"preview-interface-retention",
				"interface archived selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
			],
		] as const;
		for (const [kind, options, action, label] of retentionCases) {
			const transition = prepare(
				"preview-retention",
				evidenceFamilyState(kind, options),
			);
			expect(transition.kind).toBe("handled");
			if (transition.kind !== "handled") continue;
			expect(
				transition.effects.find(
					(effect) => effect.kind === "plan-confirmation",
				),
			).toMatchObject({ kind: "plan-confirmation" });
			expect(transition.effects.at(-1)).toEqual({
				kind: "notice",
				notice: {
					level: "info",
					message: `status evidence action ${action} M ${label}`,
				},
			});
		}
		const configuredRetention = prepare("preview-retention", {
			...evidenceFamilyState("audit-archive", { duplicate: true }),
			retentionLimit: 1,
		});
		expect(configuredRetention.kind).toBe("handled");
		if (configuredRetention.kind === "handled") {
			expect(
				configuredRetention.effects.find(
					(effect) => effect.kind === "plan-confirmation",
				),
			).toMatchObject({ plan: { maxItems: 1, candidateItems: [auditItem] } });
		}
		expect(
			prepare("archive-evidence", evidenceFamilyState("audit-archive")),
		).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "status evidence archive unavailable for audit-archive",
					},
				},
			],
		});
	});

	test("moves each legacy evidence index and reports every empty shelf", () => {
		const cases = [
			[
				"move-cleanup-export",
				"selectedCleanupExportIndex",
				"cleanup export",
				"no cleanup exports indexed",
				"cleanupExportIndex",
				cleanupItem,
			],
			[
				"move-audit-export",
				"selectedAuditExportIndex",
				"audit export",
				"no audit exports indexed",
				"auditExportIndex",
				auditItem,
			],
			[
				"move-audit-archive",
				"selectedAuditExportArchiveIndex",
				"audit archive",
				"no audit archive indexed",
				"auditExportArchiveIndex",
				auditItem,
			],
			[
				"move-cleanup-archive",
				"selectedCleanupExportArchiveIndex",
				"cleanup archive",
				"no cleanup archive indexed",
				"cleanupExportArchiveIndex",
				cleanupItem,
			],
		] as const;
		for (const [
			command,
			patchKey,
			label,
			emptyMessage,
			indexKey,
			item,
		] of cases) {
			expect(prepare(command)).toEqual({
				kind: "handled",
				effects: [
					{
						kind: "notice",
						notice: { level: "warn", message: emptyMessage },
					},
				],
			});
			const second = {
				...item,
				fileName: `second-${item.fileName}`,
				path: `/tmp/second-${item.fileName}`,
			};
			expect(
				prepare(command, {
					evidence: {
						indexes: {
							[indexKey]: { baseDir: "/tmp", items: [item, second] },
						},
					},
				}),
			).toEqual({
				kind: "handled",
				effects: [
					{ kind: "state", patch: { [patchKey]: 1 } },
					{
						kind: "notice",
						notice: {
							level: "info",
							message: `${label} selected ${second.fileName}`,
						},
					},
				],
			});
		}
	});

	test("returns deterministic audit write plans and exact publication descriptors", () => {
		const transition = prepare("export-copy-intent", {
			activity: { copyIntents: [copyIntent] },
		});
		expect(transition).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "audit-write",
					writer: "status-activity-copy-intent",
					plan: {
						path: "/tmp/picos/audit/picos-audit-selected-2026-08-08T010203000Z.log",
						eventCount: 1,
						query: "status activity cleanup jump-cleanup",
						scope: "selected",
					},
					publication: {
						setLastStatusActivityCopyIntentAuditExport: true,
						refreshAuditExportIndex: false,
					},
					successMessagePrefix: "status activity copy intent exported",
					failureMessagePrefix: "status activity copy intent export failed",
				},
			],
		});
		if (transition.kind !== "handled") return;
		const write = transition.effects[0];
		if (write?.kind !== "audit-write") return;
		expect(formatStatusAuditWriteSuccess(write, write.plan)).toEqual({
			level: "ok",
			message: `status activity copy intent exported ${write.plan.path} events=1`,
		});
		expect(
			formatStatusAuditWriteFailure(write, new Error("disk full")),
		).toEqual({
			level: "fail",
			message: "status activity copy intent export failed disk full",
		});

		const interfaceResult = {
			source: "timeline" as const,
			action: "interface-confirmation" as const,
			message:
				"interface confirmation confirmed-blocked interface.disable target=Wi-Fi",
			detail:
				'action=disable target="Wi-Fi" expected="disable interface" received="disable interface" confirmed=true willExecute=false',
		};
		expect(
			prepare("export-copy-intent", {
				activity: { results: [interfaceResult] },
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "audit-write",
					writer: "interface-confirmation",
					successMessagePrefix: "interface confirmation audit exported",
					failureMessagePrefix: "interface confirmation audit export failed",
				},
			],
		});
		expect(prepare("export-copy-intent")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no remote known_hosts evidence handoff to export",
					},
				},
			],
		});
		expect(
			prepare("export-copy-intent", {
				evidence: {
					indexes: {
						remoteKnownHostsSelectionAuditExports: [remotePlan],
					},
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						selectedStatusEvidenceKind: "remote-known-hosts",
						screen: "status",
						focusArea: "workspaces",
					},
				},
				{
					kind: "audit-write",
					writer: "remote-known-hosts",
					plan: {
						eventCount: 1,
						query: "remote known_hosts evidence handoff prod",
					},
					publication: {
						refresh: { kind: "refresh-index", target: "audit" },
					},
					successMessagePrefix: "remote known_hosts evidence handoff exported",
				},
			],
		});
	});

	test("returns complete cleanup, handoff, and config I/O descriptors", () => {
		const cleanupTransition = prepare("export-cleanup-history", {
			fileOpenOrigin: {
				kind: "config-shelf",
				target: "cleanup",
				label: "Cleanup shelf",
				scope: "all",
			},
			cleanup: {
				history: [{ ...cleanupShelf, outcome: "prompt-opened" }],
				selectedHistoryIndex: 0,
			},
		});
		expect(cleanupTransition.kind).toBe("handled");
		if (cleanupTransition.kind !== "handled") return;
		const cleanupWrite = cleanupTransition.effects.find(
			(effect) => effect.kind === "cleanup-history-write",
		);
		expect(cleanupWrite).toMatchObject({
			kind: "cleanup-history-write",
			plan: {
				itemCount: 1,
				scope: "all",
				origin: { target: "cleanup" },
			},
			refresh: {
				kind: "refresh-index",
				target: "cleanup",
				announce: false,
			},
			successMessagePrefix: "cleanup history exported",
			failureMessagePrefix: "cleanup history export failed",
		});
		if (cleanupWrite?.kind !== "cleanup-history-write") return;
		expect(
			formatStatusCleanupHistoryWriteSuccess(cleanupWrite, cleanupWrite.plan),
		).toEqual({
			level: "ok",
			message: `cleanup history exported 1 entries to ${cleanupWrite.plan.path}`,
		});
		expect(
			formatStatusCleanupHistoryWriteFailure(
				cleanupWrite,
				new Error("read-only"),
			),
		).toEqual({
			level: "fail",
			message: "cleanup history export failed read-only",
		});

		const handoffTransition = prepare(
			"archive-handoff-or-interface",
			evidenceFamilyState("handoff"),
		);
		expect(handoffTransition.kind).toBe("handled");
		if (handoffTransition.kind !== "handled") return;
		const archive = handoffTransition.effects.find(
			(effect) => effect.kind === "handoff-archive",
		);
		expect(archive).toMatchObject({
			kind: "handoff-archive",
			baseDir: "/tmp",
			path: handoffItem.path,
			selectedIndex: 0,
			refresh: { target: "handoff", announce: false },
		});
		if (archive?.kind !== "handoff-archive") return;
		expect(
			formatStatusHandoffArchiveResult(archive, {
				status: "archived",
				message: "route.md archived",
			}),
		).toEqual({ level: "ok", message: "handoff archive route.md archived" });
		expect(formatStatusHandoffArchiveFailure(archive, "denied")).toEqual({
			level: "fail",
			message: "handoff archive failed denied",
		});

		const configTransition = prepare("cycle-result-timeline-filter");
		expect(configTransition.kind).toBe("handled");
		if (configTransition.kind !== "handled") return;
		const configWrite = configTransition.effects.find(
			(effect) => effect.kind === "config-write",
		);
		expect(configWrite).toBeDefined();
		if (configWrite?.kind !== "config-write") return;
		expect(formatStatusConfigWriteFailure(configWrite, "locked")).toEqual({
			level: "warn",
			message: "status result jump filter persistence failed locked",
		});
	});

	test("returns a complete file-open confirmation for the last copy export", () => {
		expect(prepare("open-last-copy-export")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no status activity copy intent export to open",
					},
				},
			],
		});
		const lastExport = {
			path: auditItem.path,
			content: "",
			eventCount: 1,
			query: "status activity cleanup jump-cleanup",
			scope: "selected" as const,
		};
		expect(
			prepare("open-last-copy-export", {
				activity: { lastCopyIntentAuditExport: lastExport },
				evidence: {
					indexes: {
						auditExportIndex: { baseDir: "/tmp", items: [auditItem] },
					},
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						selectedAuditExportIndex: 0,
						selectedStatusEvidenceKind: "audit",
					},
				},
				{
					kind: "open-file-confirmation",
					plan: {
						path: auditItem.path,
						source: "timeline-export",
					},
					prompt: "file-open",
					screen: "status",
					clearPlans: [
						"externalOpen",
						"auditExportArchive",
						"auditArchiveRetention",
						"cleanupExportArchive",
					],
				},
				{
					kind: "notice",
					notice: {
						level: "info",
						message: `status activity copy intent export open confirmation opened for ${auditItem.path} evidence=1`,
					},
				},
			],
		});
	});

	test("focuses the last copy export without leaving result creation to App", () => {
		const lastExport = {
			path: auditItem.path,
			content: "",
			eventCount: 1,
			query: "status activity cleanup jump-cleanup",
			scope: "selected" as const,
		};
		expect(prepare("focus-last-copy-export")).toEqual({
			kind: "handled",
			effects: [
				{
					kind: "notice",
					notice: {
						level: "warn",
						message: "no status activity copy intent export to focus",
					},
				},
			],
		});
		expect(
			prepare("focus-last-copy-export", {
				activity: { lastCopyIntentAuditExport: lastExport },
				evidence: {
					indexes: {
						auditExportIndex: { baseDir: "/tmp", items: [auditItem] },
					},
				},
			}),
		).toMatchObject({
			kind: "handled",
			effects: [
				{
					kind: "state",
					patch: {
						selectedAuditExportIndex: 0,
						selectedStatusEvidenceKind: "audit",
						screen: "status",
						lastStatusActivityEvidenceFocusPlan: {
							label: auditItem.fileName,
						},
					},
				},
				{ kind: "record-activity", result: { action: "focus-evidence" } },
				{
					kind: "notice",
					notice: {
						level: "info",
						message: `status activity evidence focus kind=audit shortcut=w selected=1/1 label="${auditItem.fileName}" path="${auditItem.path}"`,
					},
				},
			],
		});
	});
});
