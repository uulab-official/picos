import { describe, expect, test } from "bun:test";
import {
	createRemoteConnectPreview,
	formatRemoteConnectConfirmationAuditMessage,
	formatRemoteHostReviewAuditMessage,
	submitRemoteConnectConfirmation,
} from "../src/core/remotes";
import type { ConsoleEvent } from "../src/tui/events";
import {
	formatProcessControlEvidencePaletteAuditMessage,
	formatRemoteKnownHostsSelectionHistoryEvidencePaletteAuditMessage,
	formatStatusActivityProcessControlPaletteAuditMessage,
	formatStatusActivityResultAuditJumpReplayWarningAuditMessage,
	formatStatusActivityResultTimelineJumpPaletteAuditMessage,
	formatStatusActivityToolsEvidenceMatchAuditMessage,
	formatTimelineEvidenceTrailPaletteAuditMessage,
} from "../src/tui/statusActivityQueue";
import {
	createTimelineFocusEvidenceTrailPlan,
	createTimelineSearchCleanupPreview,
	filterTimelineEvents,
	formatSelectedTimelinePreviewRow,
	formatTimelineWorkspaceRows,
	getSelectedTimelineAuditExportPlan,
	getSelectedTimelineClipboardPreview,
	moveTimelineSelection,
	nextTimelineFilter,
	nextTimelineSearchPreset,
	prepareTimelinePanelInput,
	prepareTimelineSearchTransition,
	repairTimelineSelection,
	resolveSelectedTimelineEvent,
	saveTimelineSearchPreset,
	selectNewestTimelineResult,
	submitTimelineSearchCleanupConfirmation,
	type TimelineFilter,
} from "../src/tui/timelinePanel";

const events: ConsoleEvent[] = [
	{
		id: "12:00:00-info-boot",
		level: "info",
		time: "12:00:00",
		message: "picos console booted",
	},
	{
		id: "12:00:01-run-network",
		level: "run",
		time: "12:00:01",
		message: "network.inspect started",
	},
	{
		id: "12:00:02-ok-routes",
		level: "ok",
		time: "12:00:02",
		message: "routes listed 8",
	},
	{
		id: "12:00:03-warn-clipboard",
		level: "warn",
		time: "12:00:03",
		message: "clipboard locked selected port via xclip",
	},
	{
		id: "12:00:04-info-network-public",
		level: "info",
		time: "12:00:04",
		message: "network public ip 203.0.113.10 -> 203.0.113.11",
	},
	{
		id: "12:00:04-info-raw",
		level: "info",
		time: "12:00:05",
		message: "raw.view queued for adapter implementation",
	},
	{
		id: "12:00:06-warn-control-preview",
		level: "warn",
		time: "12:00:06",
		message:
			'control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
	},
];

describe("timeline TUI panel formatting", () => {
	test("clamps empty and last-row timeline selection and selects newest results", () => {
		expect(repairTimelineSelection(8, 0)).toBe(0);
		expect(repairTimelineSelection(8, events.length)).toBe(events.length - 1);
		expect(resolveSelectedTimelineEvent([], 8)).toBeUndefined();
		expect(resolveSelectedTimelineEvent(events, 99)).toEqual(events.at(-1));
		expect(selectNewestTimelineResult(events.length)).toBe(events.length - 1);
		expect(selectNewestTimelineResult(0)).toBe(0);
	});

	test("owns timeline filter application and exact preset notices", () => {
		expect(
			prepareTimelineSearchTransition({
				events,
				filter: "network",
				presets: ["clipboard"],
				query: " ",
			}),
		).toEqual({
			query: "",
			presets: ["clipboard"],
			selectedIndex: 0,
			notice: { level: "info", message: "timeline search cleared" },
		});
		expect(
			prepareTimelinePanelInput({
				input: "]",
				events,
				filter: "network",
				query: "",
				presets: ["missing"],
				selectedIndex: 0,
			}),
		).toEqual({
			kind: "search",
			query: "missing",
			selectedIndex: 0,
			notice: {
				level: "warn",
				message: "timeline preset missing matches 0",
			},
		});
		expect(
			prepareTimelineSearchTransition({
				events: [],
				filter: "all",
				presets: [],
				query: " ",
			}),
		).toEqual({
			query: "",
			presets: [],
			selectedIndex: 0,
			notice: { level: "warn", message: "timeline search cleared" },
		});
	});

	test("resolves selected timeline commands after clamping", () => {
		const base = {
			filter: "all" as const,
			query: "",
			presets: [] as string[],
			selectedIndex: 99,
		};
		for (const input of ["c", "e"] as const) {
			expect(prepareTimelinePanelInput({ ...base, input, events: [] })).toEqual(
				{
					kind: "notice",
					notice: {
						level: "warn",
						message:
							input === "c"
								? "no timeline row to copy"
								: "no timeline row to export",
					},
				},
			);
			expect(
				prepareTimelinePanelInput({ ...base, input, events }),
			).toMatchObject({
				kind: "selected-command",
				command: input === "c" ? "copy" : "export",
				selectedIndex: events.length - 1,
				event: events.at(-1),
			});
		}
	});

	test("resolves timeline evidence intents or returns the exact blocked notice", () => {
		const focusEvent: ConsoleEvent = {
			id: "12:00:08-info-status-evidence-focus",
			level: "info",
			time: "12:00:08",
			message:
				'status activity evidence focus kind=audit shortcut=w selected=1/1 label="focus.log" path="/tmp/focus.log"',
		};
		const auditExportIndex = {
			baseDir: "/tmp",
			items: [
				{
					fileName: "focus.log",
					path: "/tmp/focus.log",
					generatedAt: "2026-08-09T00:00:00.000Z",
					scope: "selected" as const,
					entryCount: 1,
				},
			],
		};
		const base = {
			input: "E",
			filter: "all" as const,
			query: "",
			presets: [] as string[],
			selectedIndex: 99,
			auditExportIndex,
		};
		expect(prepareTimelinePanelInput({ ...base, events: [] })).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no timeline focus evidence trail",
			},
		});
		expect(
			prepareTimelinePanelInput({ ...base, events: [focusEvent] }),
		).toMatchObject({
			kind: "evidence",
			selectedIndex: 0,
			event: focusEvent,
			plan: {
				kind: "audit",
				selectedIndex: 0,
				path: "/tmp/focus.log",
			},
		});
	});

	test("keeps invalid timeline section shortcuts and empty cleanup as no-op decisions", () => {
		const state = {
			events,
			filter: "all" as const,
			query: "",
			presets: [] as string[],
			selectedIndex: 0,
		};
		expect(prepareTimelinePanelInput({ ...state, input: "1" })).toEqual({
			kind: "no-op",
		});
		expect(prepareTimelinePanelInput({ ...state, input: "D" })).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no timeline search presets to clean",
			},
		});
	});
	test("cycles timeline filters for keyboard use", () => {
		const sequence: TimelineFilter[] = [];
		let current: TimelineFilter = "all";
		for (let index = 0; index < 5; index += 1) {
			current = nextTimelineFilter(current);
			sequence.push(current);
		}

		expect(sequence).toEqual(["network", "audit", "action", "raw", "all"]);
	});

	test("formats all timeline events with summary counters", () => {
		expect(formatTimelineWorkspaceRows(events, 9, "all")).toEqual([
			"SUMMARY events=7 network=1 audit=2 action=3 raw=1 filter=all",
			"TIMELINE",
			"[12:00:01] RUN  action network.inspect started",
			"[12:00:02] OK   action routes listed 8",
			"[12:00:03] WARN audit  clipboard locked selected port via xclip",
			"[12:00:04] INFO network network public ip 203.0.113.10 -> 203.0.113.11",
			"[12:00:05] INFO raw    raw.view queued for adapter implementation",
			'[12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("filters audit events and keeps terminal height bounded", () => {
		expect(formatTimelineWorkspaceRows(events, 5, "audit")).toEqual([
			"SUMMARY events=2/7 network=1 audit=2 action=3 raw=1 filter=audit",
			"TIMELINE",
			"[12:00:03] WARN audit  clipboard locked selected port via xclip",
			'[12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces status activity copy intent in audit search", () => {
		const copyIntentEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:07-info-status-activity-copy",
				level: "info",
				time: "12:00:07",
				message:
					'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
			},
		];

		expect(
			formatTimelineWorkspaceRows(copyIntentEvents, 5, "audit", {
				query: "status-activity",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=status-activity",
			"TIMELINE",
			'[12:00:07] INFO audit  clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces status activity evidence focus in audit search", () => {
		const focusEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:08-info-status-evidence-focus",
				level: "info",
				time: "12:00:08",
				message:
					'status activity evidence focus kind=audit shortcut=w selected=2/2 label="picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log"',
			},
		];

		expect(
			formatTimelineWorkspaceRows(focusEvents, 5, "audit", {
				query: "evidence focus",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=evidence focus",
			"TIMELINE",
			'[12:00:08] INFO audit  status activity evidence focus kind=audit shortcut=w selected=2/2 label="picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces stale status activity audit jump warnings in audit search", () => {
		const warningEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-warn-status-audit-jump",
				level: "warn",
				time: "12:00:09",
				message: formatStatusActivityResultAuditJumpReplayWarningAuditMessage(
					"no status activity result audit jump fix=P audit jump/new result",
				),
			},
		];

		expect(
			formatTimelineWorkspaceRows(warningEvents, 5, "audit", {
				query: "fix=P audit jump/new result",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=fix=P audit jump/new result",
			"TIMELINE",
			"[12:00:09] WARN audit  status activity result audit jump warning no status activity result audit jump fix=P audit jump/new result",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces palette-triggered timeline trail actions in audit search", () => {
		const paletteTrailEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-info-palette-trail",
				level: "info",
				time: "12:00:09",
				message:
					'palette timeline trail audit action=search selected=2/3 label="picos-audit-selected-2026-07-01T040000000Z.log" query="timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log"',
			},
			{
				id: "12:00:10-info-palette-trail-source",
				level: "info",
				time: "12:00:10",
				message: formatTimelineEvidenceTrailPaletteAuditMessage(
					"source",
					undefined,
					{
						sourceFilter: "palette",
						visible: 0,
						total: 3,
					},
				),
			},
		];

		expect(
			formatTimelineWorkspaceRows(paletteTrailEvents, 5, "audit", {
				query: "action=source",
			}),
		).toEqual([
			"SUMMARY events=1/9 network=0 audit=1 action=0 raw=0 filter=audit search=action=source",
			"TIMELINE",
			"[12:00:10] INFO audit  palette timeline trail audit action=source source=palette visible=0/3",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces palette-triggered process evidence actions in audit search", () => {
		const processEvidenceEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-info-process-evidence",
				level: "info",
				time: "12:00:09",
				message: formatProcessControlEvidencePaletteAuditMessage(
					"search",
					{
						path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T050000000Z.log",
						content: "",
						eventCount: 1,
						query:
							"status activity result audit jump palette process control audit action=preview pid=12345",
						scope: "selected",
					},
					{ selectedIndex: 0, total: 1 },
				),
			},
		];

		expect(
			formatTimelineWorkspaceRows(processEvidenceEvents, 5, "audit", {
				query: "palette process evidence audit action=search",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=palette process evidence audit action=search",
			"TIMELINE",
			'[12:00:09] INFO audit  palette process evidence audit action=search selected=1/1 target="pid:12345" label="picos-audit-selected-2026-07-01T050000000Z.log" query="status activity result audit jump palette process control audit action=preview pid=12345" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T050000000Z.log"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces palette-triggered remote known_hosts evidence actions in audit search", () => {
		const knownHostsEvidenceEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-info-known-hosts-evidence",
				level: "info",
				time: "12:00:09",
				message:
					formatRemoteKnownHostsSelectionHistoryEvidencePaletteAuditMessage(
						"search",
						{
							path: "/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T060000000Z.log",
							content: "",
							eventCount: 2,
							query: "remote known_hosts selection history prod",
							scope: "filtered",
						},
						{ selectedIndex: 0, total: 1 },
					),
			},
		];

		expect(
			formatTimelineWorkspaceRows(knownHostsEvidenceEvents, 5, "audit", {
				query: "palette remote known_hosts evidence audit action=search",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=palette remote known_hosts evidence audit action=search",
			"TIMELINE",
			'[12:00:09] INFO audit  palette remote known_hosts evidence audit action=search selected=1/1 target="prod" label="picos-audit-filtered-2026-07-01T060000000Z.log" query="remote known_hosts selection history prod" path="/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T060000000Z.log"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
		const copyKnownHostsEvidenceEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-info-known-hosts-evidence-copy",
				level: "info",
				time: "12:00:09",
				message:
					formatRemoteKnownHostsSelectionHistoryEvidencePaletteAuditMessage(
						"copy",
						{
							path: "/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T060000000Z.log",
							content: "",
							eventCount: 2,
							query: "remote known_hosts selection history prod",
							scope: "filtered",
						},
						{ selectedIndex: 0, total: 1 },
					),
			},
		];

		expect(
			formatTimelineWorkspaceRows(copyKnownHostsEvidenceEvents, 5, "audit", {
				query: "palette remote known_hosts evidence audit action=copy",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=palette remote known_hosts evidence audit action=copy",
			"TIMELINE",
			'[12:00:09] INFO audit  palette remote known_hosts evidence audit action=copy selected=1/1 target="prod" label="picos-audit-filtered-2026-07-01T060000000Z.log" query="remote known_hosts selection history prod" path="/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T060000000Z.log"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces remote host review audit in Timeline search", () => {
		const remoteHostReviewEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-info-remote-host-review",
				level: "info",
				time: "12:00:09",
				message: formatRemoteHostReviewAuditMessage("stage", {
					id: "prod",
					kind: "sftp",
					host: "prod.example.com",
					port: 2222,
					username: "deploy",
					root: "/srv/app",
				}),
			},
		];

		expect(
			formatTimelineWorkspaceRows(remoteHostReviewEvents, 5, "audit", {
				query: "remote host review prod",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=remote host review prod",
			"TIMELINE",
			'[12:00:09] INFO audit  remote host review audit action=stage id=prod target="sftp://deploy@prod.example.com:2222/srv/app" host=prod.example.com port=2222 user=deploy key=none policy=read-only writes=locked network=not-opened confirm="connect remote prod"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces blocked remote connect audit in Timeline search", () => {
		const preview = createRemoteConnectPreview({
			id: "prod",
			kind: "sftp",
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
		});
		const confirmation = submitRemoteConnectConfirmation(
			preview,
			"connect remote prod",
		);
		const remoteConnectEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-warn-remote-connect",
				level: "warn",
				time: "12:00:09",
				message: formatRemoteConnectConfirmationAuditMessage(confirmation),
			},
		];

		expect(
			formatTimelineWorkspaceRows(remoteConnectEvents, 5, "audit", {
				query: "remote connect prod",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=remote connect prod",
			"TIMELINE",
			'[12:00:09] WARN audit  remote connect audit id=prod target="sftp://deploy@prod.example.com:2222/srv/app" status=confirmed-blocked dependency=ssh2 reason=host-key-review-required network=not-opened confirm="connect remote prod"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces palette-triggered status result jumps in audit search", () => {
		const paletteResultJumpEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-info-palette-result-jump",
				level: "info",
				time: "12:00:09",
				message: formatStatusActivityResultTimelineJumpPaletteAuditMessage(
					"open",
					{
						historyIndex: 3,
						jump: {
							filter: "audit",
							query: "control preview",
							message:
								"status activity result timeline search selected timeline audit",
						},
						matches: 5,
						selectedIndex: 1,
						total: 2,
					},
				),
			},
		];

		expect(
			formatTimelineWorkspaceRows(paletteResultJumpEvents, 5, "audit", {
				query: "palette status result jump",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=palette status result jump",
			"TIMELINE",
			'[12:00:09] INFO audit  palette status result jump audit action=open selected=2/2 row=4 filter=audit query="control preview" matches=5',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces palette-triggered process control previews in audit search", () => {
		const processControlEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-info-palette-process-control",
				level: "info",
				time: "12:00:09",
				message: formatStatusActivityProcessControlPaletteAuditMessage({
					actionId: "process.terminate",
					kind: "terminate",
					port: {
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "12345",
						command: "node",
						user: "alice",
					},
					confirmationPhrase: "kill pid 12345",
					risk: "destructive",
					privilege: "user",
					enabled: false,
					rows: [],
				}),
			},
		];

		expect(
			formatTimelineWorkspaceRows(processControlEvents, 5, "audit", {
				query: "palette process control audit action=preview pid=12345",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=palette process control audit action=preview pid=12345",
			"TIMELINE",
			'[12:00:09] INFO audit  palette process control audit action=preview status=locked kind=terminate target="*:3000" pid=12345 process="node" user="alice" risk=destructive privilege=user confirm="kill pid 12345"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces palette-triggered Tools evidence searches in audit search", () => {
		const toolSearchEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:09-info-tools-evidence-search",
				level: "info",
				time: "12:00:09",
				message:
					'palette tools evidence audit action=search target=active query="040100" visible=1/3',
			},
		];

		expect(
			formatTimelineWorkspaceRows(toolSearchEvents, 5, "audit", {
				query: "tools evidence action=search",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=tools evidence action=search",
			"TIMELINE",
			'[12:00:09] INFO audit  palette tools evidence audit action=search target=active query="040100" visible=1/3',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces recovered Tools evidence match actions in audit search", () => {
		const toolMatchEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:10-info-tools-evidence-match",
				level: "info",
				time: "12:00:10",
				message: formatStatusActivityToolsEvidenceMatchAuditMessage(
					"open",
					{
						target: "active",
						query: "040100",
						total: 3,
						items: [
							{
								fileName: "picos-tools-all-20260701T040100000Z.md",
								path: "/Users/me/.config/picos/tools/picos-tools-all-20260701T040100000Z.md",
								scope: "all",
								runCount: 3,
								generatedAt: "2026-07-01T04:01:00.000Z",
							},
						],
					},
					0,
				),
			},
		];

		expect(
			formatTimelineWorkspaceRows(toolMatchEvents, 5, "audit", {
				query: "tools evidence match action=open",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=tools evidence match action=open",
			"TIMELINE",
			'[12:00:10] INFO audit  status tools evidence match audit action=open target=active selected=1/1 query="040100" label="picos-tools-all-20260701T040100000Z.md" scope=all runs=3 path="/Users/me/.config/picos/tools/picos-tools-all-20260701T040100000Z.md"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("creates evidence trail plans from selected status focus audit rows", () => {
		const focusEvents: ConsoleEvent[] = [
			{
				id: "12:00:08-info-status-evidence-focus",
				level: "info",
				time: "12:00:08",
				message:
					'status activity evidence focus kind=audit shortcut=w selected=2/2 label="picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log"',
			},
		];
		const auditExportIndex = {
			baseDir: "/Users/bonjin/.config/picos/audit",
			items: [
				{
					fileName: "picos-audit-other.log",
					path: "/Users/bonjin/.config/picos/audit/picos-audit-other.log",
					generatedAt: "2026-07-01T02:00:00.000Z",
					scope: "selected" as const,
					entryCount: 1,
				},
				{
					fileName: "picos-audit-selected-2026-07-01T030000000Z.log",
					path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
					generatedAt: "2026-07-01T03:00:00.000Z",
					scope: "selected" as const,
					query: "status activity cleanup jump-cleanup",
					entryCount: 1,
				},
			],
		};

		expect(
			createTimelineFocusEvidenceTrailPlan(focusEvents, {
				auditExportIndex,
				filter: "audit",
				query: "evidence focus",
				selectedIndex: 0,
			}),
		).toEqual({
			kind: "audit",
			selectedIndex: 1,
			itemCount: 2,
			label: "picos-audit-selected-2026-07-01T030000000Z.log",
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			message:
				"timeline evidence trail audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
			rows: [
				"TIMELINE EVIDENCE TRAIL audit selected=2/2",
				"> picos-audit-selected-2026-07-01T030000000Z.log",
				"path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
				"controls=Status Evidence W=open Z=archive enter=open",
			],
		});
		expect(
			createTimelineFocusEvidenceTrailPlan(focusEvents, {
				auditExportIndex,
				filter: "audit",
				query: "missing",
				selectedIndex: 0,
			}),
		).toBeUndefined();
	});

	test("marks selected timeline rows with a stable cursor", () => {
		expect(
			formatTimelineWorkspaceRows(events, 5, "audit", {
				selectedIndex: 0,
			}),
		).toEqual([
			"SUMMARY events=2/7 network=1 audit=2 action=3 raw=1 filter=audit selected=1/2",
			"TIMELINE",
			"> [12:00:03] WARN audit  clipboard locked selected port via xclip",
			'  [12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("formats a compact selected timeline preview for jump recovery", () => {
		expect(
			formatSelectedTimelinePreviewRow(events, {
				filter: "audit",
				query: "control preview",
				selectedIndex: 0,
			}),
		).toBe(
			'selected timeline 1/1 audit search=control preview [12:00:06] WARN control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
		);

		expect(
			formatSelectedTimelinePreviewRow(events, {
				filter: "network",
				query: "not-found",
				selectedIndex: 0,
			}),
		).toBe("selected timeline none filter=network search=not-found");
	});

	test("clips selected timeline previews while preserving recovery hints", () => {
		const warningEvents: ConsoleEvent[] = [
			{
				id: "12:00:09-warn-audit-jump",
				level: "warn",
				time: "12:00:09",
				message:
					'status activity result audit jump warning command="sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder" detail="very long stale payload that would otherwise hide the recovery action" fix=P audit jump/new result',
			},
		];

		const row = formatSelectedTimelinePreviewRow(warningEvents, {
			filter: "audit",
			maxWidth: 112,
			query: "fix=P audit jump/new result",
			selectedIndex: 0,
		});

		expect(row.length).toBeLessThanOrEqual(112);
		expect(row).toStartWith(
			"selected timeline 1/1 audit search=fix=P audit jump/new result [12:00:09] WARN",
		);
		expect(row).toContain("…");
		expect(row).toEndWith("fix=P audit jump/new result");
	});

	test("adds a compact raw source hint to selected timeline previews", () => {
		expect(
			formatSelectedTimelinePreviewRow(events, {
				filter: "audit",
				query: "control preview",
				selectedIndex: 0,
				showRawSourceHint: true,
			}),
		).toBe(
			'selected timeline 1/1 audit search=control preview source=t raw c copy e export [12:00:06] WARN control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
		);
	});

	test("moves timeline selection with wraparound", () => {
		expect(moveTimelineSelection(0, 1, 2)).toBe(1);
		expect(moveTimelineSelection(1, 1, 2)).toBe(0);
		expect(moveTimelineSelection(0, -1, 2)).toBe(1);
		expect(moveTimelineSelection(4, 1, 0)).toBe(0);
	});

	test("classifies control confirmation audit records", () => {
		const confirmationEvents: ConsoleEvent[] = [
			{
				id: "12:00:07-warn-control-confirm",
				level: "warn",
				time: "12:00:07",
				message:
					'control confirmation dns.flush status=confirmed-disabled risk=write privilege=admin dryRun=true executionEnabled=false adapter=macos command="sudo dscacheutil -flushcache"',
			},
		];

		expect(formatTimelineWorkspaceRows(confirmationEvents, 4, "audit")).toEqual(
			[
				"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit",
				"TIMELINE",
				'[12:00:07] WARN audit  control confirmation dns.flush status=confirmed-disabled risk=write privilege=admin dryRun=true executionEnabled=false adapter=macos command="sudo dscacheutil -flushcache"',
				"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
			],
		);
	});

	test("classifies control simulation audit records", () => {
		const simulationEvents: ConsoleEvent[] = [
			{
				id: "12:00:08-warn-control-simulation",
				level: "warn",
				time: "12:00:08",
				message:
					'control simulation dns.flush status=blocked-by-policy policy=mutation-disabled approval=required confirmed=true executionEnabled=false blockers=disabled-by-default,mutation-approval-required,admin-approval-required,execution-disabled adapter=macos command="sudo dscacheutil -flushcache"',
			},
		];

		expect(formatTimelineWorkspaceRows(simulationEvents, 4, "audit")).toEqual([
			"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit",
			"TIMELINE",
			'[12:00:08] WARN audit  control simulation dns.flush status=blocked-by-policy policy=mutation-disabled approval=required confirmed=true executionEnabled=false blockers=disabled-by-default,mutation-approval-required,admin-approval-required,execution-disabled adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("classifies control execution dry-run audit records", () => {
		const executionEvents: ConsoleEvent[] = [
			{
				id: "12:00:09-warn-control-execution",
				level: "warn",
				time: "12:00:09",
				message:
					'control execution dns.flush status=dry-run-executed policy=dry-run confirmed=true dryRun=true willExecute=true adapter=windows command="powershell -NoProfile -Command Clear-DnsClientCache -WhatIf"',
			},
		];

		expect(formatTimelineWorkspaceRows(executionEvents, 4, "audit")).toEqual([
			"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit",
			"TIMELINE",
			'[12:00:09] WARN audit  control execution dns.flush status=dry-run-executed policy=dry-run confirmed=true dryRun=true willExecute=true adapter=windows command="powershell -NoProfile -Command Clear-DnsClientCache -WhatIf"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("classifies successful editor save records as searchable audit evidence", () => {
		const saveEvents: ConsoleEvent[] = [
			{
				id: "12:00:10-ok-editor-save",
				level: "ok",
				time: "12:00:10",
				message:
					"editor save /workspace/picos/README.md status=saved policy=local-write provider=local confirmed=true willExecute=true changed=true",
			},
		];

		expect(
			formatTimelineWorkspaceRows(saveEvents, 4, "audit", {
				query: "editor save status=saved",
			}),
		).toEqual([
			"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit search=editor save status=saved",
			"TIMELINE",
			"[12:00:10] OK   audit  editor save /workspace/picos/README.md status=saved policy=local-write provider=local confirmed=true willExecute=true changed=true",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("classifies ports file evidence unavailable records as audit", () => {
		const evidenceEvents: ConsoleEvent[] = [
			{
				id: "12:00:11-warn-port-evidence",
				level: "warn",
				time: "12:00:11",
				message:
					"ports file evidence unavailable pid=777 reason=no snapshot returned",
			},
		];

		expect(formatTimelineWorkspaceRows(evidenceEvents, 4, "audit")).toEqual([
			"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit",
			"TIMELINE",
			"[12:00:11] WARN audit  ports file evidence unavailable pid=777 reason=no snapshot returned",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("creates clipboard previews for selected audit timeline rows", () => {
		const preview = getSelectedTimelineClipboardPreview(events, {
			filter: "audit",
			selectedIndex: 1,
		});

		expect(preview).toEqual({
			source: "timeline-audit",
			label: "timeline audit 12:00:06",
			copyText:
				'[12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			details: ["filter=audit", "eventId=12:00:06-warn-control-preview"],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
	});

	test("creates selected audit export plans for the visible timeline cursor", () => {
		const plan = getSelectedTimelineAuditExportPlan(events, {
			baseDir: "/Users/bonjin/.config/picos",
			filter: "audit",
			generatedAt: new Date("2026-06-30T03:00:00.000Z"),
			query: "control",
			selectedIndex: 0,
		});

		expect(plan).toEqual({
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-06-30T030000000Z.log",
			content: [
				"# picos audit log",
				"generatedAt=2026-06-30T03:00:00.000Z",
				"scope=selected",
				"query=control",
				"events=1",
				"",
				'[12:00:06] WARN control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
				"",
			].join("\n"),
			eventCount: 1,
			scope: "selected",
			query: "control",
		});
	});

	test("filters network state-change events separately from actions", () => {
		expect(formatTimelineWorkspaceRows(events, 4, "network")).toEqual([
			"SUMMARY events=1/7 network=1 audit=2 action=3 raw=1 filter=network",
			"TIMELINE",
			"[12:00:04] INFO network network public ip 203.0.113.10 -> 203.0.113.11",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("searches timeline events and keeps preset helpers stable", () => {
		expect(
			filterTimelineEvents(events, "clipboard").map((event) => event.id),
		).toEqual(["12:00:03-warn-clipboard"]);
		expect(
			formatTimelineWorkspaceRows(events, 5, "all", {
				query: "network",
				presets: ["network", "clipboard"],
			}),
		).toEqual([
			"SUMMARY events=2/7 network=1 audit=0 action=1 raw=0 filter=all search=network presets=network|clipboard",
			"TIMELINE",
			"[12:00:01] RUN  action network.inspect started",
			"[12:00:04] INFO network network public ip 203.0.113.10 -> 203.0.113.11",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
		expect(saveTimelineSearchPreset([], " network ")).toEqual(["network"]);
		expect(saveTimelineSearchPreset(["audit", "network"], "audit")).toEqual([
			"audit",
			"network",
		]);
		expect(nextTimelineSearchPreset(["network", "audit"], "")).toBe("network");
		expect(nextTimelineSearchPreset(["network", "audit"], "network")).toBe(
			"audit",
		);
		expect(nextTimelineSearchPreset([], "network")).toBeUndefined();
	});

	test("requires exact confirmation before clearing timeline search presets", () => {
		const presets = ["network", "clipboard"];
		const preview = createTimelineSearchCleanupPreview(presets);

		expect(preview).toEqual({
			count: 2,
			confirmationPhrase: "clear timeline",
			cleanup: {
				id: "timeline.searches",
				label: "Timeline search presets",
				scope: "timeline",
				count: 2,
				verb: "clear",
				confirmationPhrase: "clear timeline",
				rows: [
					"CONFIG CLEANUP",
					"target=Timeline search presets",
					"scope=timeline count=2",
					"confirm clear timeline locked",
				],
			},
			rows: [
				"TIMELINE SEARCH CLEANUP",
				"presets=2",
				"confirm clear timeline locked",
			],
		});
		expect(
			submitTimelineSearchCleanupConfirmation(presets, "clear timelines"),
		).toEqual({
			action: "notice",
			confirmed: false,
			message: "timeline search cleanup rejected",
			presets,
			removed: 0,
			notice: {
				level: "warn",
				message: "timeline search cleanup rejected",
			},
		});
		expect(
			submitTimelineSearchCleanupConfirmation(presets, " clear timeline "),
		).toEqual({
			action: "apply",
			confirmed: true,
			message: "timeline search cleanup removed 2 presets",
			presets: [],
			removed: 2,
			notice: {
				level: "info",
				message: "timeline search cleanup removed 2 presets",
			},
		});
		expect(createTimelineSearchCleanupPreview([])).toBeUndefined();
	});
});
