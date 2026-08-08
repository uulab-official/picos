import {
	mkdir,
	readdir,
	readFile,
	rename,
	unlink,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
	type ConfigCleanupPreview,
	createConfigCleanupPreview,
	submitConfigCleanupConfirmation,
} from "../core/configCleanup";
import {
	normalizeToolTargetPresets,
	type ToolTargetPresetPreference,
} from "../core/toolHistoryPreferences";
import {
	getToolDefinitions,
	type ToolDefinition,
	type ToolId,
	type ToolResult,
} from "../core/tools";
import type { NetworkSummary } from "../core/types";
import {
	basenamePathLike,
	dirnamePathLike,
	joinPathLike,
	resolvePathLike,
	samePathLike,
} from "../utils/pathStyle";
import {
	type ClipboardPreview,
	createClipboardPreview,
} from "./clipboardPreview";
import { clampIndex } from "./navigation";

export type ToolRunActionId =
	| "tools.dns"
	| "tools.traceroute"
	| "tools.whois"
	| "tools.ipInfo"
	| "tools.tls"
	| "network.connect"
	| "ping.default";

export type ToolRunPlan = {
	actionId: ToolRunActionId;
	toolId: ToolId;
	args: string[];
	label: string;
};

export type ToolTargetPreset = {
	id: string;
	label: string;
	actionId: ToolRunActionId;
	target: string;
	hint: string;
};

export type ToolTargetNotice = {
	level: "ok" | "info" | "warn";
	message: string;
};

export type ToolTargetCommandLineIntent =
	| "close"
	| "preserve"
	| "tool-target-label"
	| "tool-target-value"
	| "tool-target-action"
	| "tool-target-cleanup";

export type ToolTargetPresetTransition = {
	presets: ToolTargetPreset[];
	selectedIndex: number;
	commandLine: ToolTargetCommandLineIntent;
	changed: boolean;
	notice: ToolTargetNotice;
};

export type ToolTargetPresetTransitionInput = {
	presets: ToolTargetPreset[];
	targetPresets: ToolTargetPreset[];
	selectedIndex: number;
	value?: string;
	limit?: number;
};

export type ToolTargetPrompt = "label" | "value" | "action" | "cleanup";

export type ToolTargetPromptIntent = ToolTargetPresetTransition;

export type ToolTargetRunIntent = {
	presets: ToolTargetPreset[];
	selectedIndex: number;
	commandLine: "preserve";
	plan?: ToolRunPlan;
	completionNotice?: string;
	notice?: ToolTargetNotice;
};

export type ToolRunActionMetadata = {
	actionId: ToolRunActionId;
	title: string;
	toolId: ToolId;
	placeholder: string;
	example: string;
	defaultTarget: string;
	cli: string;
	hint: string;
};

export type ToolFormField = {
	key: string;
	label: string;
	placeholder: string;
	value: string;
};

export type ToolFormState = {
	actionId: ToolRunActionId;
	title: string;
	toolId: ToolId;
	selectedFieldIndex: number;
	fields: ToolFormField[];
};

export type ToolTargetCleanupPreview = {
	actionId: ToolRunActionId;
	count: number;
	confirmationPhrase: string;
	rows: string[];
	cleanup: ConfigCleanupPreview;
};

export type ToolTargetCleanupConfirmation = {
	confirmed: boolean;
	removed: number;
	presets: ToolTargetPreset[];
	message: string;
};

export type ToolHistoryCleanupPreview = {
	count: number;
	confirmationPhrase: string;
	rows: string[];
	cleanup: ConfigCleanupPreview;
};

export type ToolHistoryCleanupConfirmation = {
	confirmed: boolean;
	removed: number;
	presets: string[];
	message: string;
};

export { normalizeToolTargetPresets };

const toolRunActionAliases: Record<string, ToolRunActionId> = {
	connect: "network.connect",
	dns: "tools.dns",
	ip: "tools.ipInfo",
	"ip-info": "tools.ipInfo",
	ipinfo: "tools.ipInfo",
	ping: "ping.default",
	port: "network.connect",
	rdap: "tools.whois",
	tcp: "network.connect",
	tls: "tools.tls",
	trace: "tools.traceroute",
	traceroute: "tools.traceroute",
	whois: "tools.whois",
};

const toolRunActionMetadata: Record<
	ToolRunActionId,
	Omit<ToolRunActionMetadata, "cli">
> = {
	"tools.dns": {
		actionId: "tools.dns",
		title: "DNS lookup",
		toolId: "dns",
		placeholder: "example.com",
		example: "github.com",
		defaultTarget: "example.com",
		hint: "DNS, reverse DNS, MX, CNAME, A, AAAA",
	},
	"tools.traceroute": {
		actionId: "tools.traceroute",
		title: "Traceroute",
		toolId: "traceroute",
		placeholder: "8.8.8.8",
		example: "8.8.8.8",
		defaultTarget: "8.8.8.8",
		hint: "network path hops",
	},
	"tools.whois": {
		actionId: "tools.whois",
		title: "WHOIS/RDAP lookup",
		toolId: "whois",
		placeholder: "example.com",
		example: "github.com",
		defaultTarget: "example.com",
		hint: "public registration metadata",
	},
	"tools.ipInfo": {
		actionId: "tools.ipInfo",
		title: "IP information",
		toolId: "ip-info",
		placeholder: "8.8.8.8",
		example: "8.8.8.8",
		defaultTarget: "8.8.8.8",
		hint: "ASN, organization, country, reverse DNS",
	},
	"tools.tls": {
		actionId: "tools.tls",
		title: "TLS inspector",
		toolId: "tls",
		placeholder: "example.com:443",
		example: "github.com:443",
		defaultTarget: "example.com:443",
		hint: "protocol, cipher, certificate chain",
	},
	"network.connect": {
		actionId: "network.connect",
		title: "Telnet-style TCP check",
		toolId: "telnet",
		placeholder: "example.com 443",
		example: "github.com 443",
		defaultTarget: "example.com 443",
		hint: "host and port reachability",
	},
	"ping.default": {
		actionId: "ping.default",
		title: "Ping default host",
		toolId: "ping",
		placeholder: "example.com",
		example: "8.8.8.8",
		defaultTarget: "example.com",
		hint: "platform ping reachability",
	},
};

export function getToolRunActionMetadata(
	actionId: string,
): ToolRunActionMetadata | undefined {
	const normalizedActionId = normalizeToolRunActionId(actionId);
	if (!normalizedActionId) {
		return undefined;
	}
	const metadata = toolRunActionMetadata[normalizedActionId];
	const plan = createToolRunPlan(
		normalizedActionId,
		metadata.defaultTarget,
		undefined,
		"",
	);
	return {
		...metadata,
		cli: plan
			? formatToolRunCliCommand(plan)
			: `picos tools ${metadata.toolId}`,
	};
}

export function parseToolTargetPresetCommand(
	input: string,
): ToolTargetPreset | undefined {
	const parts = input.trim().split(/\s+/).filter(Boolean);
	const [rawAction, target, ...labelParts] = parts;
	if (!rawAction || !target) {
		return undefined;
	}
	const actionId = toolRunActionAliases[rawAction.toLowerCase()] ?? rawAction;
	const plan = createToolRunPlan(actionId, "example.com", undefined, target);
	if (!plan) {
		return undefined;
	}
	const label = labelParts.length
		? labelParts.join(" ")
		: `${rawAction.toLowerCase()} ${target}`;
	const [preset] = normalizeToolTargetPresets([
		{
			id: `custom-${plan.actionId}-${target}`,
			label,
			actionId: plan.actionId,
			target,
			hint: `saved ${rawAction.toLowerCase()} target`,
		},
	]);
	return preset as ToolTargetPreset | undefined;
}

export type ToolHistoryItem = {
	id: string;
	time: string;
	status: "ok" | "fail";
	label: string;
	plan: ToolRunPlan;
	title: string;
	summary: string;
	rawOutput: string;
};

export type ToolHistoryExportScope = "selected" | "all" | "compare";
export type ToolHistoryEvidenceFilter = "any" | ToolHistoryExportScope;

export type ToolHistorySort = "time" | "tool" | "status";

export type ToolHistoryGroup = "none" | "tool" | "status";

export type ToolHistoryDetailView = "raw" | "summary" | "command" | "compare";

export type ToolSectionClipboardSelection = "target" | "status";

export type ToolCopyPreviewMode =
	| "raw"
	| "summary"
	| "compare"
	| ToolSectionClipboardSelection
	| "row"
	| false;

const toolCopyPreviewValueLimit = 64;

export type ToolHistoryExportPlan = {
	path: string;
	content: string;
	itemCount: number;
	scope: ToolHistoryExportScope;
};

export type ToolHistoryExportIndexItem = {
	fileName: string;
	path: string;
	generatedAt: string;
	scope: ToolHistoryExportScope;
	runCount: number;
};

export type ToolHistoryExportIndex = {
	baseDir: string;
	items: ToolHistoryExportIndexItem[];
};

export type ToolHistoryExportArchivePlan = {
	sourcePath: string;
	archivedPath: string;
	fileName: string;
	risk: "write";
	privilege: "user";
	confirmationRequired: true;
	confirmationPhrase: "archive tools export";
	confirmed: boolean;
	enabled: boolean;
	reason: string;
};

export type ToolHistoryExportArchiveResult = {
	status: "archived" | "blocked";
	sourcePath: string;
	archivedPath: string;
	message: string;
};

export type ToolHistoryArchiveRetentionPlan = {
	baseDir: string;
	maxItems: number;
	retainedItems: ToolHistoryExportIndexItem[];
	candidateItems: ToolHistoryExportIndexItem[];
	risk: "destructive";
	privilege: "user";
	confirmationRequired: true;
	confirmationPhrase: "prune tools archive";
	confirmed: boolean;
	enabled: boolean;
	reason: string;
};

export type ToolHistoryArchivePruneResult = {
	status: "pruned" | "blocked";
	removed: number;
	removedPaths: string[];
	message: string;
};

export type FilteredToolHistoryItem = {
	index: number;
	item: ToolHistoryItem;
};

export function createToolRunPlan(
	actionId: string,
	defaultTarget: string,
	summary?: NetworkSummary,
	targetInput = "",
): ToolRunPlan | undefined {
	const target = targetInput.trim() || defaultTarget || "example.com";
	if (actionId === "tools.dns") {
		return {
			actionId,
			toolId: "dns",
			args: [target],
			label: `${actionId} ${target}`,
		};
	}
	if (actionId === "tools.traceroute") {
		return {
			actionId,
			toolId: "traceroute",
			args: [target],
			label: `${actionId} ${target}`,
		};
	}
	if (actionId === "tools.whois") {
		return {
			actionId,
			toolId: "whois",
			args: [target],
			label: `${actionId} ${target}`,
		};
	}
	if (actionId === "tools.ipInfo") {
		const ip = (targetInput.trim() || summary?.publicIp) ?? "8.8.8.8";
		return {
			actionId,
			toolId: "ip-info",
			args: [ip],
			label: `${actionId} ${ip}`,
		};
	}
	if (actionId === "tools.tls") {
		const tlsTarget = target.includes(":") ? target : `${target}:443`;
		return {
			actionId,
			toolId: "tls",
			args: [tlsTarget],
			label: `${actionId} ${tlsTarget}`,
		};
	}
	if (actionId === "network.connect") {
		const { host, port } = parseHostPortTarget(target);
		return {
			actionId,
			toolId: "telnet",
			args: [host, port],
			label: `${actionId} ${host}:${port}`,
		};
	}
	if (actionId === "ping.default") {
		return {
			actionId,
			toolId: "ping",
			args: [target],
			label: `${actionId} ${target}`,
		};
	}
	return undefined;
}

export function createToolFormState(
	actionIdInput: string,
	defaultTarget: string,
	summary?: NetworkSummary,
	targetInput = "",
	selectedFieldIndex = 0,
): ToolFormState | undefined {
	const actionId = normalizeToolRunActionId(actionIdInput);
	if (!actionId) {
		return undefined;
	}
	const metadata = getToolRunActionMetadata(actionId);
	if (!metadata) {
		return undefined;
	}
	const definition = getToolDefinition(metadata.toolId);
	if (!definition) {
		return undefined;
	}
	const plan = createToolRunPlan(
		actionId,
		defaultTarget || metadata.defaultTarget,
		summary,
		targetInput,
	);
	const values = createToolFormValues(
		definition,
		plan,
		metadata,
		summary,
		targetInput,
	);
	return {
		actionId,
		title: metadata.title,
		toolId: metadata.toolId,
		selectedFieldIndex: Math.min(
			Math.max(selectedFieldIndex, 0),
			Math.max(0, definition.fields.length - 1),
		),
		fields: definition.fields.map((field) => ({
			...field,
			value: values[field.key] ?? field.placeholder,
		})),
	};
}

export function selectToolFormField(
	form: ToolFormState | undefined,
	fieldIndex: number,
): ToolFormState | undefined {
	if (!form || form.fields.length <= 0) {
		return form;
	}
	return {
		...form,
		selectedFieldIndex: Math.min(
			Math.max(fieldIndex, 0),
			form.fields.length - 1,
		),
	};
}

export function moveToolFormField(
	form: ToolFormState | undefined,
	direction: "next" | "previous",
): ToolFormState | undefined {
	if (!form || form.fields.length <= 0) {
		return form;
	}
	const offset = direction === "next" ? 1 : -1;
	return {
		...form,
		selectedFieldIndex:
			(form.selectedFieldIndex + offset + form.fields.length) %
			form.fields.length,
	};
}

export function updateToolFormFieldValue(
	form: ToolFormState | undefined,
	value: string,
): ToolFormState | undefined {
	if (!form || form.fields.length <= 0) {
		return form;
	}
	const selectedFieldIndex = Math.min(
		Math.max(form.selectedFieldIndex, 0),
		form.fields.length - 1,
	);
	return {
		...form,
		selectedFieldIndex,
		fields: form.fields.map((field, index) =>
			index === selectedFieldIndex ? { ...field, value } : field,
		),
	};
}

export function formatToolFormInputValue(
	form: ToolFormState | undefined,
	options: { preserveEmpty?: boolean } = {},
): string {
	if (!form) {
		return "";
	}
	if (form.toolId === "telnet" || form.toolId === "port-check") {
		const valueFor = options.preserveEmpty
			? getToolFormRawFieldValue
			: getToolFormFieldValue;
		return [
			valueFor(form, "host", "example.com"),
			valueFor(form, "port", "443"),
		].join(" ");
	}
	return (
		options.preserveEmpty ? getToolFormRawFieldValue : getToolFormFieldValue
	)(form, form.fields[0]?.key ?? "target", "");
}

export function createToolRunPlanFromForm(
	form: ToolFormState | undefined,
): ToolRunPlan | undefined {
	if (!form) {
		return undefined;
	}
	const target = formatToolFormInputValue(form);
	const plan = createToolRunPlan(form.actionId, "", undefined, target);
	if (!plan) {
		return undefined;
	}
	return {
		...plan,
		label: `${form.title} ${formatToolFormTargetLabel(form)}`.trim(),
	};
}

export function formatToolFormRows(form: ToolFormState | undefined): string[] {
	if (!form) {
		return [];
	}
	const plan = createToolRunPlanFromForm(form);
	const selected = Math.min(
		Math.max(form.selectedFieldIndex, 0),
		Math.max(0, form.fields.length - 1),
	);
	return [
		`TOOLS FORM ${form.title}`,
		`action=${form.actionId} tool=${form.toolId} fields=${form.fields.length} selected=${selected + 1}/${form.fields.length}`,
		...form.fields.map((field, index) => {
			const marker = index === selected ? ">" : " ";
			const value = field.value.trim() || "<empty>";
			return `${marker} ${field.label} ${value} placeholder=${field.placeholder}`;
		}),
		`cli=${plan ? formatToolRunCliCommand(plan) : `picos tools ${form.toolId}`}`,
		"controls=tab/shift-tab field enter=run esc=cancel",
	];
}

export function createToolRunPlanFromPreset(
	preset: ToolTargetPreset,
): ToolRunPlan | undefined {
	return createToolRunPlan(
		preset.actionId,
		preset.target,
		undefined,
		preset.target,
	);
}

export function getToolTargetPresets(
	summary: NetworkSummary | undefined,
	defaultTarget: string,
	customPresets: ToolTargetPresetPreference[] = [],
): ToolTargetPreset[] {
	const fallbackTarget = defaultTarget.trim() || "example.com";
	const presets: ToolTargetPreset[] = [
		...normalizeToolTargetPresets(customPresets),
		{
			id: "default-ping",
			label: "Default ping",
			actionId: "ping.default",
			target: fallbackTarget,
			hint: "default reachability target",
		},
	];

	if (summary?.gateway) {
		presets.push({
			id: "gateway-ping",
			label: "Gateway ping",
			actionId: "ping.default",
			target: summary.gateway,
			hint: "primary gateway",
		});
	}

	for (const [index, server] of (summary?.dnsServers ?? [])
		.slice(0, 2)
		.entries()) {
		presets.push({
			id: `dns-${index + 1}`,
			label: `DNS server ${index + 1}`,
			actionId: "tools.dns",
			target: server,
			hint: "resolver check",
		});
	}

	if (summary?.publicIp) {
		presets.push({
			id: "public-ip",
			label: "Public IP",
			actionId: "tools.ipInfo",
			target: summary.publicIp,
			hint: "external address metadata",
		});
	}

	presets.push(
		{
			id: "web-https",
			label: "HTTPS check",
			actionId: "network.connect",
			target: `${fallbackTarget}:443`,
			hint: "default TLS port",
		},
		{
			id: "web-tls",
			label: "TLS inspect",
			actionId: "tools.tls",
			target: `${fallbackTarget}:443`,
			hint: "certificate metadata",
		},
	);

	return dedupeToolTargetPresets(presets);
}

export function appendToolHistory(
	history: ToolHistoryItem[],
	input: {
		plan: ToolRunPlan;
		result: ToolResult;
		status?: "ok" | "fail";
	},
	time = new Date().toLocaleTimeString("en-US", { hour12: false }),
	limit = 12,
): ToolHistoryItem[] {
	const item: ToolHistoryItem = {
		id: createToolHistoryId(time, input.plan.label),
		time,
		status: input.status ?? "ok",
		label: input.plan.label,
		plan: input.plan,
		title: input.result.title,
		summary: summarizeToolResult(input.result),
		rawOutput: input.result.rawOutput,
	};
	return [...history, item].slice(-limit);
}

export function formatToolsWorkspaceRows(
	history: ToolHistoryItem[],
	visibleRows: number,
	selectedIndex = Math.max(0, history.length - 1),
	filterQuery = "",
	sort: ToolHistorySort = "time",
	group: ToolHistoryGroup = "none",
	presets: string[] = [],
	detailView: ToolHistoryDetailView = "raw",
	targetPresets: ToolTargetPreset[] = [],
	selectedTargetPresetIndex = 0,
	sectionClipboardSelection: ToolSectionClipboardSelection = "target",
	sectionClipboardRowIndex = 0,
	copyPreviewMode: ToolCopyPreviewMode = false,
): string[] {
	const filtered = sortToolHistory(history, filterQuery, sort);
	const latestIndex = getVisibleToolHistoryIndex(
		history,
		selectedIndex,
		filterQuery,
		sort,
	);
	const latest = filtered.find((entry) => entry.index === latestIndex)?.item;
	const historyRows = formatGroupedToolHistoryRows(
		filtered,
		latestIndex,
		group,
	);
	const bodyRows = latest
		? [
				...historyRows,
				...formatToolHistoryDetailRows(latest, detailView, {
					section: sectionClipboardSelection,
					rowIndex: sectionClipboardRowIndex,
					history,
					selectedIndex: latestIndex,
				}),
			]
		: [history.length ? "no matching tool runs" : "no tool runs yet"];
	const targetRows = formatToolTargetPresetRows(
		targetPresets,
		selectedTargetPresetIndex,
	).slice(0, Math.max(0, visibleRows - 2));
	const visibleBodyRows = targetRows.length && !latest ? [] : bodyRows;
	const filter = filterQuery.trim();
	const presetSummary = formatToolHistoryPresetSummary(presets);
	const detailSummary = detailView === "raw" ? "" : ` detail=${detailView}`;
	const activeTargetPreset = getSelectedToolTargetPreset(
		targetPresets,
		selectedTargetPresetIndex,
	);
	const sectionRowCount = latest
		? getToolSectionClipboardRowCountForItem(latest, sectionClipboardSelection)
		: 0;
	const sectionRowSummary =
		sectionRowCount > 0
			? ` · ,/. row=${Math.min(Math.max(sectionClipboardRowIndex, 0), sectionRowCount - 1) + 1}/${sectionRowCount} · b row`
			: "";
	const copyTargetPreview = latest
		? formatToolSectionCopyTargetPreview(
				latest,
				sectionClipboardSelection,
				sectionClipboardRowIndex,
			)
		: undefined;
	const copySectionPreview = latest
		? formatToolSectionCopyPreview(latest, sectionClipboardSelection)
		: undefined;
	const copyModePreview = latest
		? formatToolCopyModePreview(
				latest,
				copyPreviewMode,
				sectionClipboardSelection,
				sectionClipboardRowIndex,
			)
		: undefined;
	const copyHelpPreview =
		latest && visibleRows >= 14
			? formatToolCopyHelpPreview(latest, sectionClipboardSelection)
			: undefined;
	const copyUnavailableHint =
		latest && visibleRows >= 14
			? formatToolCopyUnavailableHint(latest, sectionClipboardSelection)
			: undefined;
	return [
		`TOOLS history=${history.length}${filter ? ` filter=${filter} matches=${filtered.length}` : ""}${sort !== "time" ? ` sort=${sort}` : ""}${group !== "none" ? ` group=${group}` : ""}${presetSummary ? ` presets=${presetSummary}` : ""}${targetPresets.length ? ` targets=${targetPresets.length} active=${activeTargetPreset?.label}:${activeTargetPreset?.target}` : ""}${detailSummary} selected=${latest?.title ?? "-"}`,
		...targetRows,
		...visibleBodyRows,
		...(copyHelpPreview ? [copyHelpPreview] : []),
		...(copyUnavailableHint ? [copyUnavailableHint] : []),
		...(copyModePreview ? [copyModePreview] : []),
		...(copySectionPreview ? [copySectionPreview] : []),
		...(copyTargetPreview ? [copyTargetPreview] : []),
		`shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=${sectionClipboardSelection}${sectionRowSummary} · v copy section · c raw`,
	].slice(0, visibleRows);
}

export function filterToolHistory(
	history: ToolHistoryItem[],
	query: string,
): FilteredToolHistoryItem[] {
	const normalized = query.trim().toLowerCase();
	return history
		.map((item, index) => ({ index, item }))
		.filter(({ item }) => {
			if (!normalized) {
				return true;
			}
			return formatToolHistorySearchText(item).includes(normalized);
		});
}

export function getVisibleToolHistoryIndex(
	history: ToolHistoryItem[],
	selectedIndex: number,
	query: string,
	sort: ToolHistorySort = "time",
): number {
	const filtered = sortToolHistory(history, query, sort);
	if (!filtered.length) {
		return 0;
	}
	if (filtered.some((entry) => entry.index === selectedIndex)) {
		return selectedIndex;
	}
	return filtered[0]?.index ?? 0;
}

export function sortToolHistory(
	history: ToolHistoryItem[],
	query: string,
	sort: ToolHistorySort,
): FilteredToolHistoryItem[] {
	const filtered = filterToolHistory(history, query);
	if (sort === "time") {
		return filtered;
	}
	return [...filtered].sort((left, right) => {
		if (sort === "status") {
			const status =
				getToolHistoryStatusRank(left.item.status) -
				getToolHistoryStatusRank(right.item.status);
			return status || left.index - right.index;
		}
		const tool = left.item.plan.actionId.localeCompare(
			right.item.plan.actionId,
		);
		return (
			tool ||
			left.item.label.localeCompare(right.item.label) ||
			left.index - right.index
		);
	});
}

export function nextToolHistorySort(sort: ToolHistorySort): ToolHistorySort {
	if (sort === "time") {
		return "tool";
	}
	if (sort === "tool") {
		return "status";
	}
	return "time";
}

export function nextToolHistoryGroup(
	group: ToolHistoryGroup,
): ToolHistoryGroup {
	if (group === "none") {
		return "tool";
	}
	if (group === "tool") {
		return "status";
	}
	return "none";
}

export function nextToolHistoryDetailView(
	view: ToolHistoryDetailView,
): ToolHistoryDetailView {
	if (view === "raw") {
		return "summary";
	}
	if (view === "summary") {
		return "command";
	}
	if (view === "command") {
		return "compare";
	}
	return "raw";
}

export function getToolHistoryDetailViewShortcut(
	input: string,
	options: { home?: boolean; end?: boolean } = {},
): ToolHistoryDetailView | undefined {
	if (options.home) {
		return "raw";
	}
	if (options.end) {
		return "compare";
	}
	if (input === "1") {
		return "raw";
	}
	if (input === "2") {
		return "summary";
	}
	if (input === "3") {
		return "command";
	}
	if (input === "4") {
		return "compare";
	}
	return undefined;
}

export function nextToolSectionClipboardSelection(
	selection: ToolSectionClipboardSelection,
): ToolSectionClipboardSelection {
	return selection === "target" ? "status" : "target";
}

export function saveToolHistoryPreset(
	presets: string[],
	query: string,
	limit = 6,
): string[] {
	const normalized = query.trim();
	if (!normalized) {
		return presets;
	}
	return [
		normalized,
		...presets.filter((preset) => preset !== normalized),
	].slice(0, limit);
}

export function createToolHistoryCleanupPreview(
	presets: string[],
): ToolHistoryCleanupPreview | undefined {
	const normalized = presets.map((preset) => preset.trim()).filter(Boolean);
	if (!normalized.length) {
		return undefined;
	}
	const cleanup = createConfigCleanupPreview({
		id: "tools.history.filters",
		label: "Tools history filter presets",
		scope: "tools history",
		count: normalized.length,
		verb: "clear",
	});
	return {
		count: normalized.length,
		confirmationPhrase: cleanup.confirmationPhrase,
		rows: [
			"TOOLS HISTORY CLEANUP",
			`filter-presets=${normalized.length}`,
			`confirm ${cleanup.confirmationPhrase} locked`,
		],
		cleanup,
	};
}

export function submitToolHistoryCleanupConfirmation(
	presets: string[],
	confirmation: string,
): ToolHistoryCleanupConfirmation {
	const preview = createToolHistoryCleanupPreview(presets);
	if (!preview) {
		return {
			confirmed: false,
			removed: 0,
			presets,
			message: "tool history filter cleanup unavailable",
		};
	}
	const cleanupConfirmation = submitConfigCleanupConfirmation(
		preview.cleanup,
		confirmation,
	);
	if (!cleanupConfirmation.confirmed) {
		return {
			confirmed: false,
			removed: 0,
			presets,
			message: "tool history filter cleanup rejected",
		};
	}
	return {
		confirmed: true,
		removed: preview.count,
		presets: [],
		message: `tool history filter cleanup removed ${preview.count} presets`,
	};
}

export function saveToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	limit = 8,
): ToolTargetPreset[] {
	const [nextPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	if (!nextPreset) {
		return normalizeToolTargetPresets(presets).slice(0, limit);
	}
	return normalizeToolTargetPresets([
		nextPreset,
		...presets.filter(
			(current) =>
				`${current.actionId}:${current.target.trim()}` !==
				`${nextPreset.actionId}:${nextPreset.target}`,
		),
	]).slice(0, limit);
}

export function removeToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
): ToolTargetPreset[] {
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	if (!targetPreset) {
		return normalizeToolTargetPresets(presets);
	}
	return normalizeToolTargetPresets(presets).filter(
		(current) =>
			`${current.actionId}:${current.target}` !==
			`${targetPreset.actionId}:${targetPreset.target}`,
	);
}

export function removeToolTargetPresetsByAction(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
): ToolTargetPreset[] {
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset) {
		return normalized;
	}
	const selectedIsSaved = normalized.some(
		(current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`,
	);
	if (!selectedIsSaved) {
		return normalized;
	}
	return normalized.filter(
		(current) => current.actionId !== targetPreset.actionId,
	);
}

export function createToolTargetCleanupPreview(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
): ToolTargetCleanupPreview | undefined {
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset) {
		return undefined;
	}
	const selectedIsSaved = normalized.some(
		(current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`,
	);
	if (!selectedIsSaved) {
		return undefined;
	}
	const count = normalized.filter(
		(current) => current.actionId === targetPreset.actionId,
	).length;
	const cleanup = createConfigCleanupPreview({
		id: `tools.targets.${targetPreset.actionId}`,
		label: "Tools target presets",
		scope: targetPreset.actionId,
		count,
		verb: "delete",
	});
	return {
		actionId: targetPreset.actionId,
		count,
		confirmationPhrase: cleanup.confirmationPhrase,
		rows: [
			"TOOL TARGET CLEANUP",
			`action=${targetPreset.actionId} saved=${count}`,
			`confirm ${cleanup.confirmationPhrase} locked`,
		],
		cleanup,
	};
}

export function submitToolTargetCleanupConfirmation(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	confirmation: string,
): ToolTargetCleanupConfirmation {
	const preview = createToolTargetCleanupPreview(presets, preset);
	const normalized = normalizeToolTargetPresets(presets);
	if (!preview) {
		return {
			confirmed: false,
			removed: 0,
			presets: normalized,
			message: "tool target action cleanup unavailable",
		};
	}
	const cleanupConfirmation = submitConfigCleanupConfirmation(
		preview.cleanup,
		confirmation,
	);
	if (!cleanupConfirmation.confirmed) {
		return {
			confirmed: false,
			removed: 0,
			presets: normalized,
			message: `tool target action cleanup rejected ${preview.actionId}`,
		};
	}
	const next = removeToolTargetPresetsByAction(normalized, preset);
	return {
		confirmed: true,
		removed: normalized.length - next.length,
		presets: next,
		message: `tool target action removed ${preview.actionId} (${normalized.length - next.length} presets)`,
	};
}

export function renameToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	label: string,
): ToolTargetPreset[] {
	const nextLabel = label.trim();
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset || !nextLabel) {
		return normalized;
	}
	return normalized.map((current) =>
		`${current.actionId}:${current.target}` ===
		`${targetPreset.actionId}:${targetPreset.target}`
			? { ...current, label: nextLabel }
			: current,
	);
}

export function retargetToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	target: string,
): ToolTargetPreset[] {
	const nextTarget = target.trim();
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset || !nextTarget) {
		return normalized;
	}
	return normalizeToolTargetPresets(
		normalized.map((current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`
				? { ...current, target: nextTarget }
				: current,
		),
	);
}

export function reassignToolTargetPresetAction(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	actionId: string,
): ToolTargetPreset[] {
	const nextActionId = normalizeToolRunActionId(actionId);
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset || !nextActionId) {
		return normalized;
	}
	return normalizeToolTargetPresets(
		normalized.map((current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`
				? { ...current, actionId: nextActionId }
				: current,
		),
	);
}

export function promoteToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
): ToolTargetPreset[] {
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset) {
		return normalized;
	}
	const index = normalized.findIndex(
		(current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`,
	);
	if (index <= 0) {
		return normalized;
	}
	return [
		normalized[index],
		...normalized.slice(0, index),
		...normalized.slice(index + 1),
	];
}

export function getSelectedToolTargetPreset(
	presets: readonly ToolTargetPreset[],
	selectedIndex: number,
): ToolTargetPreset | undefined {
	if (!presets.length) {
		return undefined;
	}
	return presets[clampIndex(selectedIndex, presets.length)];
}

export function selectToolTargetPresetTransition(
	presets: readonly ToolTargetPreset[],
	selectedIndex: number,
	direction: "next" | "previous",
): {
	selectedIndex: number;
	preset?: ToolTargetPreset;
	notice?: ToolTargetNotice;
} {
	const nextIndex = moveToolTargetPresetSelection(
		selectedIndex,
		presets.length,
		direction,
	);
	const preset = getSelectedToolTargetPreset(presets, nextIndex);
	if (!preset) {
		return { selectedIndex: nextIndex };
	}
	return {
		selectedIndex: nextIndex,
		preset,
		notice: {
			level: "info",
			message: `tool target ${preset.label} ${preset.target}`,
		},
	};
}

export function renameToolTargetPresetTransition(
	input: ToolTargetPresetTransitionInput,
): ToolTargetPresetTransition {
	return createToolTargetEditTransition(input, "label");
}

export function retargetToolTargetPresetTransition(
	input: ToolTargetPresetTransitionInput,
): ToolTargetPresetTransition {
	return createToolTargetEditTransition(input, "target");
}

export function reassignToolTargetPresetActionTransition(
	input: ToolTargetPresetTransitionInput,
): ToolTargetPresetTransition {
	return createToolTargetEditTransition(input, "action");
}

export function promoteToolTargetPresetTransition(
	input: Omit<ToolTargetPresetTransitionInput, "value" | "limit">,
): ToolTargetPresetTransition {
	const presets = normalizeToolTargetPresets(input.presets);
	const selectedIndex = clampIndex(
		input.selectedIndex,
		input.targetPresets.length,
	);
	const preset = getSelectedToolTargetPreset(
		input.targetPresets,
		input.selectedIndex,
	);
	if (!preset) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "preserve",
			changed: false,
			notice: { level: "warn", message: "no tool target preset selected" },
		});
	}
	const next = promoteToolTargetPreset(presets, preset);
	const changed = !sameToolTargetPresetShelf(next, presets);
	if (!changed) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "preserve",
			changed: false,
			notice: {
				level: "warn",
				message: `tool target ${preset.label} is not a movable saved preset`,
			},
		});
	}
	return createToolTargetTransition({
		presets: next,
		selectedIndex: 0,
		commandLine: "preserve",
		changed: true,
		notice: {
			level: "info",
			message: `tool target pinned ${preset.label} ${preset.target}`,
		},
	});
}

export function removeToolTargetPresetTransition(
	input: Omit<ToolTargetPresetTransitionInput, "value" | "limit">,
): ToolTargetPresetTransition {
	const presets = normalizeToolTargetPresets(input.presets);
	const selectedIndex = clampIndex(
		input.selectedIndex,
		input.targetPresets.length,
	);
	const preset = getSelectedToolTargetPreset(
		input.targetPresets,
		input.selectedIndex,
	);
	if (!preset) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "preserve",
			changed: false,
			notice: { level: "warn", message: "no tool target preset selected" },
		});
	}
	const next = removeToolTargetPreset(presets, preset);
	const changed = !sameToolTargetPresetShelf(next, presets);
	if (!changed) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "preserve",
			changed: false,
			notice: {
				level: "warn",
				message: `tool target ${preset.label} is not a saved preset`,
			},
		});
	}
	return createToolTargetTransition({
		presets: next,
		selectedIndex: clampIndex(
			input.selectedIndex,
			Math.max(0, input.targetPresets.length - 1),
		),
		commandLine: "preserve",
		changed: true,
		notice: {
			level: "info",
			message: `tool target removed ${preset.label} ${preset.target}`,
		},
	});
}

export function submitToolTargetCleanupTransition(
	input: Required<Pick<ToolTargetPresetTransitionInput, "value">> &
		Omit<ToolTargetPresetTransitionInput, "value" | "limit">,
): ToolTargetPresetTransition {
	const presets = normalizeToolTargetPresets(input.presets);
	const preset = getSelectedToolTargetPreset(
		input.targetPresets,
		input.selectedIndex,
	);
	const confirmation = submitToolTargetCleanupConfirmation(
		presets,
		preset,
		input.value,
	);
	const changed = confirmation.confirmed;
	return createToolTargetTransition({
		presets: confirmation.presets,
		selectedIndex: clampIndex(
			input.selectedIndex,
			Math.max(0, input.targetPresets.length - confirmation.removed),
		),
		commandLine: "close",
		changed,
		notice: {
			level: confirmation.confirmed ? "info" : "warn",
			message: confirmation.message,
		},
	});
}

export function submitToolTargetPresetCommandTransition(
	input: Required<Pick<ToolTargetPresetTransitionInput, "value">> &
		ToolTargetPresetTransitionInput,
): ToolTargetPresetTransition {
	const presets = normalizeToolTargetPresets(input.presets);
	const selectedIndex = clampIndex(
		input.selectedIndex,
		input.targetPresets.length,
	);
	const preset = parseToolTargetPresetCommand(input.value);
	if (!preset) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "close",
			changed: false,
			notice: {
				level: "warn",
				message: "tool target preset requires: <action> <target> [label]",
			},
		});
	}
	const next = saveToolTargetPreset(presets, preset, input.limit);
	return createToolTargetTransition({
		presets: next,
		selectedIndex: clampIndex(
			next.findIndex((current) => sameToolTargetPreset(current, preset)),
			next.length,
		),
		commandLine: "close",
		changed: !sameToolTargetPresetShelf(next, presets),
		notice: {
			level: "ok",
			message: `tool target preset saved ${preset.label} ${preset.target}`,
		},
	});
}

export function saveSelectedToolTargetPresetTransition(
	input: Omit<ToolTargetPresetTransitionInput, "value">,
): ToolTargetPresetTransition {
	const presets = normalizeToolTargetPresets(input.presets);
	const selectedIndex = clampIndex(
		input.selectedIndex,
		input.targetPresets.length,
	);
	const preset = getSelectedToolTargetPreset(
		input.targetPresets,
		input.selectedIndex,
	);
	if (!preset) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "preserve",
			changed: false,
			notice: { level: "warn", message: "no tool target preset to save" },
		});
	}
	const next = saveToolTargetPreset(presets, preset, input.limit);
	return createToolTargetTransition({
		presets: next,
		selectedIndex: clampIndex(
			next.findIndex((current) => sameToolTargetPreset(current, preset)),
			next.length,
		),
		commandLine: "preserve",
		changed: !sameToolTargetPresetShelf(next, presets),
		notice: {
			level: "info",
			message: `tool target saved ${preset.label} ${preset.target}`,
		},
	});
}

export function createToolTargetPromptIntent(
	input: Omit<ToolTargetPresetTransitionInput, "value" | "limit"> & {
		prompt: ToolTargetPrompt;
	},
): ToolTargetPromptIntent {
	const presets = normalizeToolTargetPresets(input.presets);
	const selectedIndex = clampIndex(
		input.selectedIndex,
		input.targetPresets.length,
	);
	const preset = getSelectedToolTargetPreset(
		input.targetPresets,
		input.selectedIndex,
	);
	if (!preset) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "preserve",
			changed: false,
			notice: { level: "warn", message: "no tool target preset selected" },
		});
	}
	if (input.prompt === "cleanup") {
		const preview = createToolTargetCleanupPreview(presets, preset);
		if (!preview) {
			return createToolTargetTransition({
				presets,
				selectedIndex,
				commandLine: "preserve",
				changed: false,
				notice: {
					level: "warn",
					message: `tool target ${preset.label} is not a saved preset`,
				},
			});
		}
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "tool-target-cleanup",
			changed: false,
			notice: {
				level: "warn",
				message: `tool target cleanup confirm ${preview.confirmationPhrase}`,
			},
		});
	}
	if (!isSavedToolTargetPreset(presets, preset)) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "preserve",
			changed: false,
			notice: {
				level: "warn",
				message: `tool target ${preset.label} is not a saved preset`,
			},
		});
	}
	const commandLine = `tool-target-${input.prompt}` as const;
	return createToolTargetTransition({
		presets,
		selectedIndex,
		commandLine,
		changed: false,
		notice: {
			level: "info",
			message: `tool target ${input.prompt} opened ${preset.label}`,
		},
	});
}

export function createToolTargetRunIntent(input: {
	presets: ToolTargetPreset[];
	selectedIndex: number;
}): ToolTargetRunIntent {
	const selectedIndex = clampIndex(input.selectedIndex, input.presets.length);
	const preset = getSelectedToolTargetPreset(
		input.presets,
		input.selectedIndex,
	);
	if (!preset) {
		return {
			presets: input.presets,
			selectedIndex,
			commandLine: "preserve",
			notice: { level: "warn", message: "no tool target presets" },
		};
	}
	const plan = createToolRunPlanFromPreset(preset);
	if (!plan) {
		return {
			presets: input.presets,
			selectedIndex,
			commandLine: "preserve",
			notice: {
				level: "warn",
				message: `cannot run tool preset ${preset.label}`,
			},
		};
	}
	return {
		presets: input.presets,
		selectedIndex,
		commandLine: "preserve",
		plan,
		completionNotice: `${preset.label} completed`,
	};
}

function createToolTargetEditTransition(
	input: ToolTargetPresetTransitionInput,
	kind: "label" | "target" | "action",
): ToolTargetPresetTransition {
	const presets = normalizeToolTargetPresets(input.presets);
	const selectedIndex = clampIndex(
		input.selectedIndex,
		input.targetPresets.length,
	);
	const preset = getSelectedToolTargetPreset(
		input.targetPresets,
		input.selectedIndex,
	);
	if (!preset) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "close",
			changed: false,
			notice: { level: "warn", message: "no tool target preset selected" },
		});
	}
	if (!isSavedToolTargetPreset(presets, preset)) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "close",
			changed: false,
			notice: {
				level: "warn",
				message: `tool target ${preset.label} is not a saved preset`,
			},
		});
	}
	const next =
		kind === "label"
			? renameToolTargetPreset(presets, preset, input.value ?? "")
			: kind === "target"
				? retargetToolTargetPreset(presets, preset, input.value ?? "")
				: reassignToolTargetPresetAction(presets, preset, input.value ?? "");
	const changed = !sameToolTargetPresetShelf(next, presets);
	if (!changed) {
		return createToolTargetTransition({
			presets,
			selectedIndex,
			commandLine: "close",
			changed: false,
			notice: {
				level: "info",
				message:
					kind === "label"
						? "tool target label unchanged"
						: kind === "target"
							? "tool target value unchanged"
							: "tool target action unchanged",
			},
		});
	}
	return createToolTargetTransition({
		presets: next,
		selectedIndex: getUpdatedToolTargetPresetSelectionIndex(
			input,
			presets,
			next,
			preset,
			kind,
		),
		commandLine: "close",
		changed: true,
		notice: {
			level: "info",
			message:
				kind === "label"
					? `tool target renamed ${preset.target}`
					: kind === "target"
						? `tool target updated ${preset.label}`
						: `tool target action updated ${preset.label}`,
		},
	});
}

function createToolTargetTransition(
	transition: ToolTargetPresetTransition,
): ToolTargetPresetTransition {
	return transition;
}

function isSavedToolTargetPreset(
	presets: readonly ToolTargetPreset[],
	preset: ToolTargetPreset,
): boolean {
	return presets.some((current) => sameToolTargetPreset(current, preset));
}

function sameToolTargetPreset(
	left: ToolTargetPreset,
	right: ToolTargetPreset,
): boolean {
	return (
		left.actionId === right.actionId &&
		left.target.trim() === right.target.trim()
	);
}

function sameToolTargetPresetShelf(
	left: readonly ToolTargetPreset[],
	right: readonly ToolTargetPreset[],
): boolean {
	return (
		left.length === right.length &&
		left.every(
			(preset, index) =>
				preset.id === right[index]?.id &&
				preset.label === right[index]?.label &&
				preset.actionId === right[index]?.actionId &&
				preset.target === right[index]?.target &&
				preset.hint === right[index]?.hint,
		)
	);
}

function getUpdatedToolTargetPresetSelectionIndex(
	input: ToolTargetPresetTransitionInput,
	previous: readonly ToolTargetPreset[],
	next: readonly ToolTargetPreset[],
	preset: ToolTargetPreset,
	kind: "label" | "target" | "action",
): number {
	const survivor =
		next.find((current) => current.id === preset.id) ??
		next.find((current) =>
			sameToolTargetPreset(
				current,
				getEditedToolTargetPreset(preset, input.value ?? "", kind),
			),
		);
	const previousSurvivor = previous.find(
		(current) => current.id === survivor?.id,
	);
	const survivorIndex = previousSurvivor
		? input.targetPresets.findIndex(
				(current) =>
					current.id === previousSurvivor.id &&
					sameToolTargetPreset(current, previousSurvivor),
			)
		: -1;
	return clampIndex(
		survivorIndex < 0 ? input.selectedIndex : survivorIndex,
		input.targetPresets.length,
	);
}

function getEditedToolTargetPreset(
	preset: ToolTargetPreset,
	value: string,
	kind: "label" | "target" | "action",
): ToolTargetPreset {
	if (kind === "target") {
		return { ...preset, target: value.trim() };
	}
	if (kind === "action") {
		return {
			...preset,
			actionId: normalizeToolRunActionId(value) ?? preset.actionId,
		};
	}
	return { ...preset, label: value.trim() };
}

export function nextToolHistoryPreset(
	presets: string[],
	currentQuery: string,
): string {
	if (!presets.length) {
		return "";
	}
	const normalized = currentQuery.trim();
	const index = presets.indexOf(normalized);
	if (index < 0 || index >= presets.length - 1) {
		return presets[0] ?? "";
	}
	return presets[index + 1] ?? "";
}

export function formatToolPromptRows(
	prompt: string,
	value: string,
	selectedFieldIndex = 0,
	touchedFieldIndexes: number[] = [],
): string[] {
	if (!prompt.startsWith("tool:")) {
		return [];
	}
	const actionId = prompt.slice("tool:".length);
	const metadata = getToolRunActionMetadata(actionId);
	if (!metadata) {
		return [
			`TOOL TARGET ${actionId}`,
			`:tool ${value || " "}  enter=run esc=cancel`,
		];
	}
	const form = createToolFormState(
		actionId,
		metadata.defaultTarget,
		undefined,
		value.trim() || metadata.defaultTarget,
		selectedFieldIndex,
	);
	const rows = formatToolFormRows(form);
	const helpRow = formatToolFieldHelpRow(form, touchedFieldIndexes);
	return helpRow ? [...rows.slice(0, -2), helpRow, ...rows.slice(-2)] : rows;
}

function formatToolRunCliCommand(plan: ToolRunPlan): string {
	return `picos tools ${plan.toolId} ${plan.args.join(" ")}`.trim();
}

function formatToolFieldHelpRow(
	form: ToolFormState | undefined,
	touchedFieldIndexes: number[],
): string | undefined {
	if (!form?.fields.length) {
		return undefined;
	}
	const selectedFieldIndex = Math.min(
		Math.max(form.selectedFieldIndex, 0),
		form.fields.length - 1,
	);
	const field = form.fields[selectedFieldIndex];
	if (!field) {
		return undefined;
	}
	const touched = touchedFieldIndexes.includes(selectedFieldIndex);
	return `field help active=${field.label} touched=${touched ? "yes" : "no"} input=${touched ? "append" : "replace"} tab=next ctrl-u=clear`;
}

function getToolDefinition(toolId: ToolId): ToolDefinition | undefined {
	return getToolDefinitions().find((tool) => tool.id === toolId);
}

function createToolFormValues(
	definition: ToolDefinition,
	plan: ToolRunPlan | undefined,
	metadata: ToolRunActionMetadata,
	summary?: NetworkSummary,
	targetInput = "",
): Record<string, string> {
	if (definition.id === "telnet" || definition.id === "port-check") {
		if (targetInput && targetInput !== targetInput.trim()) {
			return parseToolFormHostPortInput(targetInput);
		}
		if (plan) {
			return {
				host: plan.args[0] || "example.com",
				port: plan.args[1] || "443",
			};
		}
		const target = parseHostPortTarget(metadata.defaultTarget);
		return {
			host: target.host,
			port: target.port,
		};
	}
	if (definition.id === "ip-info") {
		return {
			ip: plan?.args[0] ?? summary?.publicIp ?? metadata.defaultTarget,
		};
	}
	const [firstField] = definition.fields;
	return {
		[firstField?.key ?? "target"]: plan?.args[0] ?? metadata.defaultTarget,
	};
}

function getToolFormFieldValue(
	form: ToolFormState,
	key: string,
	fallback: string,
): string {
	return (
		form.fields.find((field) => field.key === key)?.value.trim() || fallback
	);
}

function getToolFormRawFieldValue(
	form: ToolFormState,
	key: string,
	_fallback: string,
): string {
	return form.fields.find((field) => field.key === key)?.value ?? "";
}

function parseToolFormHostPortInput(input: string): Record<string, string> {
	const match = input.match(/^(\S*)\s+(.*)$/);
	if (match) {
		return {
			host: match[1] ?? "",
			port: match[2] ?? "",
		};
	}
	const target = parseHostPortTarget(input);
	return {
		host: target.host,
		port: target.port,
	};
}

function formatToolFormTargetLabel(form: ToolFormState): string {
	if (form.toolId === "telnet" || form.toolId === "port-check") {
		return `${getToolFormFieldValue(form, "host", "example.com")}:${getToolFormFieldValue(form, "port", "443")}`;
	}
	return getToolFormFieldValue(form, form.fields[0]?.key ?? "target", "");
}

export function moveToolHistorySelection(
	current: number,
	total: number,
	direction: "next" | "previous",
): number {
	if (total <= 0) {
		return 0;
	}
	const normalized = clampIndex(current, total);
	const offset = direction === "next" ? 1 : -1;
	return (normalized + offset + total) % total;
}

export function moveToolTargetPresetSelection(
	current: number,
	total: number,
	direction: "next" | "previous",
): number {
	return moveToolHistorySelection(current, total, direction);
}

export function moveFilteredToolHistorySelection(
	history: ToolHistoryItem[],
	current: number,
	query: string,
	direction: "next" | "previous",
	sort: ToolHistorySort = "time",
): number {
	const filtered = sortToolHistory(history, query, sort);
	if (filtered.length <= 0) {
		return 0;
	}
	const visibleIndex = getVisibleToolHistoryIndex(
		history,
		current,
		query,
		sort,
	);
	const currentFilteredIndex = Math.max(
		0,
		filtered.findIndex((entry) => entry.index === visibleIndex),
	);
	return (
		filtered[
			moveToolHistorySelection(currentFilteredIndex, filtered.length, direction)
		]?.index ??
		filtered[0]?.index ??
		0
	);
}

export function getSelectedToolHistoryItem(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ToolHistoryItem | undefined {
	if (history.length <= 0) {
		return undefined;
	}
	return history[Math.min(Math.max(selectedIndex, 0), history.length - 1)];
}

export function rerunToolHistoryItem(
	item: ToolHistoryItem | undefined,
): ToolRunPlan | undefined {
	return item?.plan;
}

export function getSelectedToolOutputClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	if (!item) {
		return undefined;
	}
	return createClipboardPreview({
		source: "tool-output",
		label: `${item.label} raw output`,
		copyText: item.rawOutput,
		details: formatToolClipboardPreviewDetails(item, "c raw"),
	});
}

export function getSelectedToolSummaryClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	if (!item) {
		return undefined;
	}
	return createClipboardPreview({
		source: "tool-summary",
		label: `${item.label} summary`,
		copyText: item.summary,
		details: formatToolClipboardPreviewDetails(item, "y summary"),
	});
}

export function getSelectedToolCompareClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	if (!item) {
		return undefined;
	}
	const previous = findPreviousMatchingToolHistoryItem(
		history,
		Math.min(Math.max(selectedIndex, 0), history.length - 1),
		item,
	);
	return createClipboardPreview({
		source: "tool-compare",
		label: `${item.label} compare`,
		copyText: formatToolHistoryCompareRows(item, previous).join("\n"),
		details: formatToolClipboardPreviewDetails(item, "o compare", [
			previous
				? `previous ${formatToolHistoryCompareRunLabel(previous)}`
				: "previous none",
		]),
	});
}

export function getSelectedToolTargetClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	return getSelectedToolSectionClipboardPreview(
		history,
		selectedIndex,
		"target",
	);
}

export function getSelectedToolSectionClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
	selection: ToolSectionClipboardSelection,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	const sectionLabel = selection === "target" ? "Target" : "Status";
	const sectionLines = item
		? extractRawSection(item.rawOutput, sectionLabel)
		: [];
	if (!item || sectionLines.length <= 0) {
		return undefined;
	}
	return createClipboardPreview({
		source: selection === "target" ? "tool-target" : "tool-status",
		label: `${item.label} ${selection} fields`,
		copyText: sectionLines.join("\n"),
		details: formatToolClipboardPreviewDetails(item, "v section", [
			`section ${selection} rows ${sectionLines.length}`,
		]),
	});
}

export function moveToolSectionClipboardRow(
	history: ToolHistoryItem[],
	selectedIndex: number,
	selection: ToolSectionClipboardSelection,
	currentIndex: number,
	direction: "previous" | "next",
): number {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	const count = item
		? getToolSectionClipboardRowCountForItem(item, selection)
		: 0;
	if (count <= 0) {
		return 0;
	}
	const normalized = Math.min(Math.max(currentIndex, 0), count - 1);
	return direction === "next"
		? (normalized + 1) % count
		: (normalized - 1 + count) % count;
}

export function getSelectedToolSectionRowClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
	selection: ToolSectionClipboardSelection,
	rowIndex: number,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	const sectionLines = item ? getToolSectionClipboardRows(item, selection) : [];
	if (!item || sectionLines.length <= 0) {
		return undefined;
	}
	const bounded = Math.min(Math.max(rowIndex, 0), sectionLines.length - 1);
	return createClipboardPreview({
		source: "tool-row",
		label: `${item.label} ${selection} row ${bounded + 1}`,
		copyText: sectionLines[bounded] ?? "",
		details: formatToolClipboardPreviewDetails(item, "b row", [
			`section ${selection} row ${bounded + 1}/${sectionLines.length}`,
		]),
	});
}

function formatToolClipboardPreviewDetails(
	item: ToolHistoryItem,
	path: string,
	extra: string[] = [],
): string[] {
	return [
		`path ${path}`,
		...extra,
		`tool ${item.plan.toolId}`,
		`action ${item.plan.actionId}`,
	];
}

export function formatToolHistoryExport(
	history: ToolHistoryItem[],
	options: {
		generatedAt?: string;
		scope: ToolHistoryExportScope;
		selectedIndex?: number;
	},
): string {
	const generatedAt = options.generatedAt ?? new Date().toISOString();
	const items = getToolHistoryExportItems(
		history,
		options.selectedIndex ?? Math.max(0, history.length - 1),
		options.scope,
	);
	return [
		"# picos tools history",
		`generatedAt=${generatedAt}`,
		`scope=${options.scope}`,
		`runs=${items.length}`,
		"",
		...items.flatMap(formatToolHistoryExportItem),
	].join("\n");
}

export function createToolHistoryExportPlan(
	history: ToolHistoryItem[],
	selectedIndex: number,
	options: {
		baseDir: string;
		generatedAt?: Date;
		scope: ToolHistoryExportScope;
	},
): ToolHistoryExportPlan | undefined {
	const items = getToolHistoryExportItems(
		history,
		selectedIndex,
		options.scope,
	);
	if (!items.length) {
		return undefined;
	}
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	return {
		path: joinPathLike(
			options.baseDir,
			"tools",
			`picos-tools-${options.scope}-${iso.replaceAll(/[:.]/g, "")}.md`,
		),
		content: formatToolHistoryExport(items, {
			generatedAt: iso,
			scope: options.scope,
			selectedIndex: options.scope === "selected" ? 0 : selectedIndex,
		}),
		itemCount: items.length,
		scope: options.scope,
	};
}

export function createToolHistoryCompareExportPlan(
	history: ToolHistoryItem[],
	selectedIndex: number,
	options: {
		baseDir: string;
		generatedAt?: Date;
	},
): ToolHistoryExportPlan | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	if (!item) {
		return undefined;
	}
	const boundedIndex = Math.min(Math.max(selectedIndex, 0), history.length - 1);
	const previous = findPreviousMatchingToolHistoryItem(
		history,
		boundedIndex,
		item,
	);
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	return {
		path: joinPathLike(
			options.baseDir,
			"tools",
			`picos-tools-compare-${iso.replaceAll(/[:.]/g, "")}.md`,
		),
		content: [
			"# picos tools compare",
			`generatedAt=${iso}`,
			"scope=compare",
			"runs=1",
			"",
			`## ${item.label}`,
			...formatToolHistoryCompareRows(item, previous),
			"",
		].join("\n"),
		itemCount: 1,
		scope: "compare",
	};
}

export async function writeToolHistoryExport(
	plan: ToolHistoryExportPlan,
): Promise<ToolHistoryExportPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}

export async function readToolHistoryExportIndex(
	baseDir: string,
	limit = 20,
): Promise<ToolHistoryExportIndex> {
	const toolsDir = join(baseDir, "tools");
	return readToolHistoryExportIndexFromDirectory(toolsDir, limit);
}

export async function readToolHistoryExportArchiveIndex(
	baseDir: string,
	limit = 20,
): Promise<ToolHistoryExportIndex> {
	const archiveDir = join(baseDir, "tools", "archive");
	return readToolHistoryExportIndexFromDirectory(archiveDir, limit);
}

async function readToolHistoryExportIndexFromDirectory(
	toolsDir: string,
	limit: number,
): Promise<ToolHistoryExportIndex> {
	let entries: string[];
	try {
		entries = await readdir(toolsDir);
	} catch (caught) {
		if ((caught as NodeJS.ErrnoException).code === "ENOENT") {
			return { baseDir: toolsDir, items: [] };
		}
		throw caught;
	}

	const items = (
		await Promise.all(
			entries
				.filter(isPicosToolHistoryExportFilename)
				.map((entry) => readToolHistoryExportIndexItem(join(toolsDir, entry))),
		)
	)
		.filter((item): item is ToolHistoryExportIndexItem => Boolean(item))
		.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
		.slice(0, limit);
	return { baseDir: toolsDir, items };
}

export function createToolHistoryExportArchivePlan(
	baseDir: string,
	path: string,
	options: { confirmation?: string } = {},
): ToolHistoryExportArchivePlan {
	const toolsDir = resolvePathLike(baseDir, "tools");
	const sourcePath = resolvePathLike(path);
	const sourceDir = dirnamePathLike(sourcePath);
	const fileName = basenamePathLike(sourcePath);
	const allowed =
		samePathLike(sourceDir, toolsDir) &&
		isPicosToolHistoryExportFilename(fileName);
	const confirmed = options.confirmation === "archive tools export";
	const archivedPath = allowed
		? joinPathLike(sourceDir, "archive", fileName)
		: "";
	const reason = !allowed
		? "tools export archive is limited to picos-owned export files"
		: confirmed
			? `ready to archive tools export ${fileName}`
			: "type archive tools export to move selected tools export";

	return {
		sourcePath,
		archivedPath,
		fileName,
		risk: "write",
		privilege: "user",
		confirmationRequired: true,
		confirmationPhrase: "archive tools export",
		confirmed,
		enabled: allowed && confirmed,
		reason,
	};
}

export function formatToolHistoryExportArchiveRows(
	plan: ToolHistoryExportArchivePlan | undefined,
): string[] {
	if (!plan) {
		return [];
	}
	return [
		`TOOLS EVIDENCE ARCHIVE ${plan.fileName}`,
		`risk=${plan.risk} privilege=${plan.privilege} confirmed=${plan.confirmed}`,
		`confirm ${plan.confirmationPhrase} ${plan.enabled ? "ready" : "locked"}`,
		`from=${plan.sourcePath}`,
		`to=${plan.archivedPath || "-"}`,
		`reason=${plan.reason}`,
	];
}

export async function archiveToolHistoryExport(
	plan: ToolHistoryExportArchivePlan,
): Promise<ToolHistoryExportArchiveResult> {
	if (!plan.enabled) {
		return {
			status: "blocked",
			sourcePath: plan.sourcePath,
			archivedPath: plan.archivedPath,
			message: `tools export archive is locked: ${plan.reason}`,
		};
	}

	await mkdir(dirname(plan.archivedPath), { recursive: true });
	await rename(plan.sourcePath, plan.archivedPath);
	return {
		status: "archived",
		sourcePath: plan.sourcePath,
		archivedPath: plan.archivedPath,
		message: `archived tools export ${plan.fileName}`,
	};
}

export function createToolHistoryArchiveRetentionPlan(
	index: ToolHistoryExportIndex,
	options: { maxItems?: number; confirmation?: string } = {},
): ToolHistoryArchiveRetentionPlan {
	const maxItems = Math.max(1, Math.floor(options.maxItems ?? 10));
	const sorted = [...index.items].sort((left, right) =>
		right.generatedAt.localeCompare(left.generatedAt),
	);
	const retainedItems = sorted.slice(0, maxItems);
	const candidateItems = sorted.slice(maxItems);
	const confirmed = options.confirmation === "prune tools archive";
	const reason =
		candidateItems.length === 0
			? `tools archive retention has no files beyond ${maxItems}`
			: confirmed
				? `ready to prune ${candidateItems.length} archived tools exports`
				: `type prune tools archive to remove ${candidateItems.length} archived tools exports`;
	return {
		baseDir: index.baseDir,
		maxItems,
		retainedItems,
		candidateItems,
		risk: "destructive",
		privilege: "user",
		confirmationRequired: true,
		confirmationPhrase: "prune tools archive",
		confirmed,
		enabled: candidateItems.length > 0 && confirmed,
		reason,
	};
}

export function formatToolHistoryArchiveRetentionRows(
	plan: ToolHistoryArchiveRetentionPlan | undefined,
	visibleRows = 8,
): string[] {
	if (!plan) {
		return [];
	}
	return [
		`TOOLS ARCHIVE RETENTION max=${plan.maxItems} candidates=${plan.candidateItems.length}`,
		`risk=${plan.risk} privilege=${plan.privilege} confirmed=${plan.confirmed}`,
		`confirm ${plan.confirmationPhrase} ${plan.enabled ? "ready" : "locked"}`,
		...plan.retainedItems.slice(0, 2).map((item) => `keep ${item.fileName}`),
		...plan.candidateItems
			.slice(0, Math.max(0, visibleRows - 5))
			.map((item) => `remove ${item.fileName}`),
		`reason=${plan.reason}`,
	].slice(0, visibleRows);
}

export async function pruneToolHistoryExportArchive(
	plan: ToolHistoryArchiveRetentionPlan,
): Promise<ToolHistoryArchivePruneResult> {
	if (!plan.enabled) {
		return {
			status: "blocked",
			removed: 0,
			removedPaths: [],
			message: `tools archive retention is locked: ${plan.reason}`,
		};
	}

	const unsafe = plan.candidateItems.find(
		(item) => !isAllowedArchivedToolHistoryExportPath(plan.baseDir, item),
	);
	if (unsafe) {
		return {
			status: "blocked",
			removed: 0,
			removedPaths: [],
			message: `tools archive retention refused unsafe path ${unsafe.path}`,
		};
	}

	const removedPaths: string[] = [];
	for (const item of plan.candidateItems) {
		await unlink(item.path);
		removedPaths.push(item.path);
	}
	return {
		status: "pruned",
		removed: removedPaths.length,
		removedPaths,
		message: `pruned ${removedPaths.length} archived tools exports`,
	};
}

export function getSelectedToolHistoryExport(
	index: ToolHistoryExportIndex,
	selectedIndex: number,
	filter: ToolHistoryEvidenceFilter = "any",
	query = "",
): ToolHistoryExportIndexItem | undefined {
	const filtered = filterToolHistoryExportIndex(index, filter, query);
	if (filtered.items.length === 0) {
		return undefined;
	}
	return filtered.items[
		Math.min(Math.max(selectedIndex, 0), filtered.items.length - 1)
	];
}

export function filterToolHistoryExportIndex(
	index: ToolHistoryExportIndex,
	filter: ToolHistoryEvidenceFilter = "any",
	query = "",
): ToolHistoryExportIndex {
	const normalizedQuery = normalizeToolHistoryEvidenceQuery(query);
	const queryTokens = normalizedQuery ? normalizedQuery.split(" ") : [];
	const items =
		filter === "any"
			? index.items
			: index.items.filter((item) => item.scope === filter);
	if (queryTokens.length === 0) {
		return filter === "any" ? index : { baseDir: index.baseDir, items };
	}
	return {
		baseDir: index.baseDir,
		items: items.filter((item) =>
			matchesToolHistoryExportQuery(item, queryTokens),
		),
	};
}

export function normalizeToolHistoryEvidenceQuery(query: string): string {
	return query.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

export function nextToolHistoryEvidenceFilter(
	filter: ToolHistoryEvidenceFilter,
): ToolHistoryEvidenceFilter {
	const filters: ToolHistoryEvidenceFilter[] = [
		"any",
		"selected",
		"all",
		"compare",
	];
	const currentIndex = filters.indexOf(filter);
	return filters[(currentIndex + 1) % filters.length] ?? "any";
}

export function formatToolHistoryExportIndexRows(
	index: ToolHistoryExportIndex,
	selectedIndex = 0,
	visibleRows = 8,
	filter: ToolHistoryEvidenceFilter = "any",
	query = "",
): string[] {
	const normalizedQuery = normalizeToolHistoryEvidenceQuery(query);
	const filtered = filterToolHistoryExportIndex(index, filter, normalizedQuery);
	const selected = getSelectedToolHistoryExport(filtered, selectedIndex);
	const selectedTargets = selected ? [`open target=${selected.path}`] : [];
	const budget = Math.max(0, visibleRows - 1 - selectedTargets.length);
	const headingParts =
		filter === "any" && !normalizedQuery
			? [`TOOLS EVIDENCE ${index.items.length}`]
			: [`TOOLS EVIDENCE ${filtered.items.length}/${index.items.length}`];
	if (filter !== "any") {
		headingParts.push(`filter=${filter}`);
	}
	if (normalizedQuery) {
		headingParts.push(`query=${normalizedQuery}`);
	}
	headingParts.push(`base=${index.baseDir}`);
	const heading = headingParts.join(" ");
	if (filtered.items.length === 0) {
		return [heading, "no matching tools evidence"].slice(0, visibleRows);
	}
	return [
		heading,
		...filtered.items
			.slice(0, budget)
			.map((item, itemIndex) =>
				[
					itemIndex === selectedIndex ? ">" : " ",
					item.scope,
					`runs=${item.runCount}`,
					item.generatedAt,
					item.fileName,
				].join(" "),
			),
		...selectedTargets,
	].slice(0, visibleRows);
}

function matchesToolHistoryExportQuery(
	item: ToolHistoryExportIndexItem,
	tokens: string[],
): boolean {
	const haystack = [
		item.fileName,
		item.generatedAt,
		item.scope,
		`runs=${item.runCount}`,
		item.path,
	]
		.join(" ")
		.toLowerCase();
	return tokens.every((token) => haystack.includes(token));
}

function summarizeToolResult(result: ToolResult): string {
	const section = result.sections[0];
	if (!section) {
		return result.title;
	}
	return `${section.label}: ${section.lines.slice(0, 2).join(" | ")}`;
}

function getToolHistoryExportItems(
	history: ToolHistoryItem[],
	selectedIndex: number,
	scope: ToolHistoryExportScope,
): ToolHistoryItem[] {
	if (scope === "all") {
		return history;
	}
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	return item ? [item] : [];
}

function formatToolHistoryExportItem(item: ToolHistoryItem): string[] {
	return [
		`## [${item.time}] ${item.label}`,
		`status=${item.status}`,
		`title=${item.title}`,
		`summary=${item.summary}`,
		`command=picos tools ${item.plan.toolId} ${item.plan.args.join(" ")}`,
		"",
		"```txt",
		item.rawOutput,
		"```",
		"",
	];
}

async function readToolHistoryExportIndexItem(
	path: string,
): Promise<ToolHistoryExportIndexItem | undefined> {
	const fileName = basename(path);
	const content = await readFile(path, "utf8");
	const metadata = parseToolHistoryExportMetadata(content);
	const scope = toToolHistoryExportScope(metadata.scope);
	const generatedAt =
		metadata.generatedAt ?? generatedAtFromToolExportFilename(fileName);
	if (!scope || !generatedAt) {
		return undefined;
	}
	return {
		fileName,
		path,
		generatedAt,
		scope,
		runCount: toNonNegativeInt(metadata.runs),
	};
}

function parseToolHistoryExportMetadata(
	content: string,
): Record<string, string> {
	const metadata: Record<string, string> = {};
	for (const line of content.split(/\r?\n/).slice(0, 8)) {
		const match = /^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(line);
		if (match) {
			metadata[match[1]] = match[2] ?? "";
		}
	}
	return metadata;
}

function isPicosToolHistoryExportFilename(fileName: string): boolean {
	return /^picos-tools-(selected|all|compare)-\d{4}-\d{2}-\d{2}T\d{9}Z\.md$/.test(
		fileName,
	);
}

function isAllowedArchivedToolHistoryExportPath(
	archiveDir: string,
	item: ToolHistoryExportIndexItem,
): boolean {
	const target = resolvePathLike(item.path);
	return (
		samePathLike(dirnamePathLike(target), resolvePathLike(archiveDir)) &&
		basenamePathLike(target) === item.fileName &&
		isPicosToolHistoryExportFilename(item.fileName)
	);
}

function generatedAtFromToolExportFilename(
	fileName: string,
): string | undefined {
	const match =
		/^picos-tools-(?:selected|all|compare)-(\d{4}-\d{2}-\d{2}T\d{6}\d{3}Z)\.md$/.exec(
			fileName,
		);
	if (!match?.[1]) {
		return undefined;
	}
	const value = match[1];
	return `${value.slice(0, 13)}:${value.slice(13, 15)}:${value.slice(15, 17)}.${value.slice(17, 20)}Z`;
}

function toToolHistoryExportScope(
	value: string | undefined,
): ToolHistoryExportScope | undefined {
	return value === "selected" || value === "all" || value === "compare"
		? value
		: undefined;
}

function toNonNegativeInt(value: string | undefined): number {
	const parsed = Number.parseInt(value ?? "0", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getToolHistoryStatusRank(status: ToolHistoryItem["status"]): number {
	return status === "ok" ? 0 : 1;
}

function formatGroupedToolHistoryRows(
	entries: FilteredToolHistoryItem[],
	selectedIndex: number,
	group: ToolHistoryGroup,
): string[] {
	if (group === "none") {
		return entries.map((entry) => formatToolHistoryRow(entry, selectedIndex));
	}
	const counts = countToolHistoryGroups(entries, group);
	const rows: string[] = [];
	let currentGroup = "";
	for (const entry of entries) {
		const nextGroup = getToolHistoryGroupLabel(entry.item, group);
		if (nextGroup !== currentGroup) {
			currentGroup = nextGroup;
			rows.push(`## ${currentGroup} (${counts.get(currentGroup) ?? 0})`);
		}
		rows.push(formatToolHistoryRow(entry, selectedIndex));
	}
	return rows;
}

function countToolHistoryGroups(
	entries: FilteredToolHistoryItem[],
	group: ToolHistoryGroup,
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		const label = getToolHistoryGroupLabel(entry.item, group);
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return counts;
}

function formatToolHistoryPresetSummary(presets: string[]): string {
	return presets.slice(0, 3).join(",");
}

function formatToolTargetPresetRows(
	presets: ToolTargetPreset[],
	selectedIndex: number,
): string[] {
	if (!presets.length) {
		return [];
	}
	const normalizedIndex = clampIndex(selectedIndex, presets.length);
	return [
		"TARGET PRESETS n/N cycle · T save · U pin · L label · M edit · A action · X delete · D delete action · R run",
		...presets.map(
			(preset, index) =>
				`${index === normalizedIndex ? ">" : " "} ${preset.label} ${preset.target} ${preset.hint}`,
		),
	];
}

function formatToolHistoryDetailRows(
	item: ToolHistoryItem,
	view: ToolHistoryDetailView,
	marker?: {
		section: ToolSectionClipboardSelection;
		rowIndex: number;
		history?: ToolHistoryItem[];
		selectedIndex?: number;
	},
): string[] {
	if (view === "summary") {
		return [
			"DETAIL summary",
			`title=${item.title}`,
			`status=${item.status}`,
			`summary=${item.summary}`,
			`command=${formatToolHistoryCommand(item)}`,
		];
	}
	if (view === "command") {
		return [
			"DETAIL command",
			`action=${item.plan.actionId}`,
			`tool=${item.plan.toolId}`,
			`args=${item.plan.args.join(" ") || "-"}`,
			`rerun=${formatToolHistoryCommand(item)}`,
		];
	}
	if (view === "compare") {
		return formatToolHistoryCompareRows(
			item,
			findPreviousMatchingToolHistoryItem(
				marker?.history ?? [],
				typeof marker?.selectedIndex === "number" ? marker.selectedIndex : -1,
				item,
			),
		);
	}
	return [
		item.summary,
		"RAW",
		...formatRawToolOutputRows(item.rawOutput, marker),
	];
}

function formatToolHistoryCommand(item: ToolHistoryItem): string {
	return `picos tools ${item.plan.toolId} ${item.plan.args.join(" ")}`.trim();
}

function findPreviousMatchingToolHistoryItem(
	history: ToolHistoryItem[],
	selectedIndex: number,
	item: ToolHistoryItem,
): ToolHistoryItem | undefined {
	const compareKey = getToolHistoryCompareKey(item);
	for (
		let index = Math.min(selectedIndex - 1, history.length - 1);
		index >= 0;
		index -= 1
	) {
		const candidate = history[index];
		if (candidate && getToolHistoryCompareKey(candidate) === compareKey) {
			return candidate;
		}
	}
	return undefined;
}

function formatToolHistoryCompareRows(
	current: ToolHistoryItem,
	previous: ToolHistoryItem | undefined,
): string[] {
	const currentLabel = formatToolHistoryCompareRunLabel(current);
	const compareKey = getToolHistoryCompareKey(current);
	if (!previous) {
		return [
			"DETAIL compare",
			`current=${currentLabel}`,
			"no previous matching tool run",
			`compare key=${compareKey}`,
		];
	}

	const previousLabel = formatToolHistoryCompareRunLabel(previous);
	const currentRawRows = splitToolHistoryRawRows(current.rawOutput);
	const previousRawRows = splitToolHistoryRawRows(previous.rawOutput);
	const delta = currentRawRows.length - previousRawRows.length;
	return [
		"DETAIL compare",
		`current=${currentLabel}`,
		`previous=${previousLabel}`,
		current.status === previous.status
			? `status=unchanged ${current.status}`
			: `status=changed ${previous.status}->${current.status}`,
		current.summary === previous.summary
			? "summary=unchanged"
			: "summary=changed",
		`raw lines current=${currentRawRows.length} previous=${previousRawRows.length} delta=${formatSignedToolHistoryDelta(delta)}`,
		...formatToolHistoryRawLineDiff(previousRawRows, currentRawRows),
		`compare key=${compareKey}`,
	];
}

function formatToolHistoryCompareRunLabel(item: ToolHistoryItem): string {
	return `${item.time} ${item.status} ${item.label}`;
}

function getToolHistoryCompareKey(item: ToolHistoryItem): string {
	return `${item.plan.actionId} ${item.plan.args.join(" ")}`.trim();
}

function splitToolHistoryRawRows(rawOutput: string): string[] {
	return rawOutput.split(/\r?\n/);
}

function formatSignedToolHistoryDelta(delta: number): string {
	return delta > 0 ? `+${delta}` : String(delta);
}

function formatToolHistoryRawLineDiff(
	previousRows: string[],
	currentRows: string[],
	limit = 6,
): string[] {
	const previousCounts = countToolHistoryRows(previousRows);
	const currentCounts = countToolHistoryRows(currentRows);
	const removed = formatToolHistoryRowCountDiff(
		previousRows,
		previousCounts,
		currentCounts,
		"-",
	);
	const added = formatToolHistoryRowCountDiff(
		currentRows,
		currentCounts,
		previousCounts,
		"+",
	);
	const rows = [...removed, ...added].slice(0, limit);
	return rows.length ? rows : ["raw=unchanged"];
}

function countToolHistoryRows(rows: string[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const row of rows) {
		counts.set(row, (counts.get(row) ?? 0) + 1);
	}
	return counts;
}

function formatToolHistoryRowCountDiff(
	rows: string[],
	leftCounts: Map<string, number>,
	rightCounts: Map<string, number>,
	prefix: "+" | "-",
): string[] {
	const seen = new Set<string>();
	const diffRows: string[] = [];
	for (const row of rows) {
		if (seen.has(row)) {
			continue;
		}
		seen.add(row);
		const delta = (leftCounts.get(row) ?? 0) - (rightCounts.get(row) ?? 0);
		for (let count = 0; count < delta; count += 1) {
			diffRows.push(`${prefix} ${truncateToolCopyPreviewValue(row, 96)}`);
		}
	}
	return diffRows;
}

function getToolSectionClipboardRows(
	item: ToolHistoryItem,
	selection: ToolSectionClipboardSelection,
): string[] {
	return extractRawSection(
		item.rawOutput,
		selection === "target" ? "Target" : "Status",
	);
}

function getToolSectionClipboardRowCountForItem(
	item: ToolHistoryItem,
	selection: ToolSectionClipboardSelection,
): number {
	return getToolSectionClipboardRows(item, selection).length;
}

function formatToolSectionCopyTargetPreview(
	item: ToolHistoryItem,
	selection: ToolSectionClipboardSelection,
	rowIndex: number,
): string | undefined {
	const rows = getToolSectionClipboardRows(item, selection);
	if (rows.length <= 0) {
		return undefined;
	}
	const boundedRowIndex = Math.min(Math.max(rowIndex, 0), rows.length - 1);
	return `copy target: section=${selection} rows=${rows.length} row=${boundedRowIndex + 1} text=${truncateToolCopyPreviewValue(rows[boundedRowIndex] ?? "")}`;
}

function formatToolSectionCopyPreview(
	item: ToolHistoryItem,
	selection: ToolSectionClipboardSelection,
): string | undefined {
	const rows = getToolSectionClipboardRows(item, selection);
	if (rows.length <= 0) {
		return undefined;
	}
	return `copy section: section=${selection} rows=${rows.length} first=${truncateToolCopyPreviewValue(rows[0] ?? "")}`;
}

function formatToolCopyModePreview(
	item: ToolHistoryItem,
	mode: ToolCopyPreviewMode,
	selection: ToolSectionClipboardSelection,
	rowIndex: number,
): string | undefined {
	if (!mode) {
		return undefined;
	}
	if (mode === "raw") {
		return "copy mode: c raw output";
	}
	if (mode === "summary") {
		return "copy mode: y summary";
	}
	if (mode === "compare") {
		return "copy mode: o compare";
	}
	if (mode === "row") {
		const count = getToolSectionClipboardRowCountForItem(item, selection);
		if (count <= 0) {
			return undefined;
		}
		const bounded = Math.min(Math.max(rowIndex, 0), count - 1);
		return `copy mode: b row section=${selection} row=${bounded + 1}/${count}`;
	}
	const count = getToolSectionClipboardRowCountForItem(item, mode);
	if (count <= 0) {
		return undefined;
	}
	return `copy mode: v section section=${mode} rows=${count}`;
}

function formatToolCopyHelpPreview(
	item: ToolHistoryItem,
	selection: ToolSectionClipboardSelection,
): string {
	const sectionRowCount = getToolSectionClipboardRowCountForItem(
		item,
		selection,
	);
	const tcpAvailability = sectionRowCount > 0 ? "ok" : "-";
	return `copy help: b row=${tcpAvailability} · v section=${tcpAvailability} · c raw=ok · y summary=ok`;
}

function formatToolCopyUnavailableHint(
	item: ToolHistoryItem,
	selection: ToolSectionClipboardSelection,
): string | undefined {
	if (getToolSectionClipboardRowCountForItem(item, selection) > 0) {
		return undefined;
	}
	return "copy hint: b/v need TCP Target or Status rows; use c raw or y summary";
}

function truncateToolCopyPreviewValue(
	value: string,
	maxLength = toolCopyPreviewValueLimit,
): string {
	if (value.length <= maxLength) {
		return value;
	}
	if (maxLength <= 3) {
		return ".".repeat(Math.max(0, maxLength));
	}
	return `${value.slice(0, maxLength - 3)}...`;
}

function formatRawToolOutputRows(
	rawOutput: string,
	marker?: {
		section: ToolSectionClipboardSelection;
		rowIndex: number;
	},
): string[] {
	if (!marker) {
		return rawOutput.split(/\r?\n/);
	}
	const markerLabel = marker.section === "target" ? "Target" : "Status";
	let currentSection = "";
	let currentSectionRow = 0;
	return rawOutput.split(/\r?\n/).map((line) => {
		const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
		if (sectionMatch) {
			currentSection = sectionMatch[1] ?? "";
			currentSectionRow = 0;
			return line;
		}
		if (line.length <= 0 || currentSection !== markerLabel) {
			return line;
		}
		const prefix =
			currentSectionRow === Math.max(0, marker.rowIndex) ? "> " : "  ";
		currentSectionRow += 1;
		return `${prefix}${line}`;
	});
}

function extractRawSection(rawOutput: string, sectionLabel: string): string[] {
	const lines = rawOutput.split(/\r?\n/);
	const start = lines.indexOf(`[${sectionLabel}]`);
	if (start < 0) {
		return [];
	}
	const sectionLines: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (/^\[[^\]]+\]$/.test(line)) {
			break;
		}
		if (line.length > 0) {
			sectionLines.push(line);
		}
	}
	return sectionLines;
}

function formatToolHistoryRow(
	entry: FilteredToolHistoryItem,
	selectedIndex: number,
): string {
	return `${entry.index === selectedIndex ? ">" : " "} [${entry.item.time}] ${entry.item.status} ${entry.item.label}`;
}

function getToolHistoryGroupLabel(
	item: ToolHistoryItem,
	group: ToolHistoryGroup,
): string {
	if (group === "status") {
		return item.status;
	}
	if (group === "tool") {
		return item.plan.actionId;
	}
	return "all";
}

function formatToolHistorySearchText(item: ToolHistoryItem): string {
	return [
		item.time,
		item.status,
		item.label,
		item.title,
		item.summary,
		item.rawOutput,
		item.plan.actionId,
		item.plan.toolId,
		...item.plan.args,
	]
		.join(" ")
		.toLowerCase();
}

function createToolHistoryId(time: string, label: string): string {
	return `${time}-${label
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-|-$/g, "")}`;
}

function parseHostPortTarget(target: string): { host: string; port: string } {
	const [hostPart, portPart] = target.split(/\s+/, 2);
	if (hostPart?.includes(":") && !portPart) {
		const separator = hostPart.lastIndexOf(":");
		return {
			host: hostPart.slice(0, separator),
			port: hostPart.slice(separator + 1) || "443",
		};
	}
	return {
		host: hostPart || "example.com",
		port: portPart || "443",
	};
}

function normalizeToolRunActionId(input: string): ToolRunActionId | undefined {
	const value = input.trim();
	if (!value) {
		return undefined;
	}
	if (
		value === "tools.dns" ||
		value === "tools.traceroute" ||
		value === "tools.whois" ||
		value === "tools.ipInfo" ||
		value === "tools.tls" ||
		value === "network.connect" ||
		value === "ping.default"
	) {
		return value;
	}
	return toolRunActionAliases[value.toLowerCase()];
}

function dedupeToolTargetPresets(
	presets: ToolTargetPreset[],
): ToolTargetPreset[] {
	const seen = new Set<string>();
	const deduped: ToolTargetPreset[] = [];
	for (const preset of presets) {
		const key = `${preset.actionId}:${preset.target}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		deduped.push(preset);
	}
	return deduped;
}
