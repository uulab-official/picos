import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	normalizeRouteFilterPresets,
	saveRouteFilterPresetValue,
} from "../core/routePresets";
import type {
	RoutePathResult,
	RouteSort,
	RouteTableResult,
} from "../core/routes";
import {
	filterRouteEntries,
	formatRouteTable,
	sortRouteEntries,
} from "../core/routes";
import {
	type ClipboardPreview,
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";

export type RouteDetailView = "table" | "raw" | "diagnostics" | "path";

export type RouteRawHandoffPlan = {
	path: string;
	content: string;
	label: string;
	view: RouteDetailView;
};

export function nextRouteDetailView(view: RouteDetailView): RouteDetailView {
	if (view === "table") {
		return "raw";
	}
	if (view === "raw") {
		return "diagnostics";
	}
	if (view === "diagnostics") {
		return "path";
	}
	return "table";
}

export function saveRouteFilterPreset(
	presets: string[],
	query: string,
): string[] {
	return saveRouteFilterPresetValue(presets, query);
}

export function nextRouteFilterPreset(
	presets: string[],
	currentQuery: string,
): string | undefined {
	if (presets.length === 0) {
		return undefined;
	}
	const normalized = normalizeRouteFilterPresets(presets);
	const current = currentQuery.trim();
	const index = normalized.indexOf(current);
	return normalized[(index + 1) % normalized.length] ?? normalized[0];
}

export function formatRouteWorkspaceRows(
	result: RouteTableResult,
	visibleRows: number,
	options: {
		copyPreview?: boolean;
		filter?: string;
		path?: RoutePathResult;
		presets?: string[];
		sort?: RouteSort;
		view?: RouteDetailView;
	} = {},
): string[] {
	const view = options.view ?? "table";
	const filter = options.filter?.trim() ?? "";
	const filteredRoutes = filterRouteEntries(result.routes, filter);
	const routeRows = sortRouteEntries(filteredRoutes, options.sort).map(
		(route) =>
			`${clip(route.destination, 18).padEnd(18)} ${clip(route.gateway, 16).padEnd(16)} ${clip(route.interfaceName, 10).padEnd(10)} ${route.family}`,
	);
	const diagnosticRows = result.diagnostics.map(
		(diagnostic) =>
			`${diagnostic.status.toUpperCase()} ${diagnostic.label}${diagnostic.detail ? ` · ${diagnostic.detail}` : ""}`,
	);
	if (view !== "table") {
		return formatRouteDetailViewRows(
			result,
			visibleRows,
			view,
			diagnosticRows,
			options.path,
			options.copyPreview ?? false,
		);
	}
	const previewRows = options.copyPreview
		? formatRouteClipboardPreviewRows(result, {
				filter,
				path: options.path,
				sort: options.sort,
				view,
			})
		: [];
	const presetSummary = formatRoutePresetSummary(options.presets);
	const fullRows = [
		[
			`SUMMARY routes=${filter ? `${filteredRoutes.length}/${result.routes.length}` : result.routes.length}`,
			presetSummary,
			`command=${result.command} ${result.args.join(" ")}`,
		]
			.filter(Boolean)
			.join(" ")
			.trim(),
		...(filter
			? [
					`FILTER ${filter} matches=${filteredRoutes.length}/${result.routes.length}`,
				]
			: []),
		...(options.sort
			? [`SORT ${options.sort.key} ${options.sort.direction}`]
			: []),
		"DIAGNOSTICS",
		...(diagnosticRows.length
			? diagnosticRows
			: ["WARN No diagnostics available"]),
		"ROUTES",
		...(routeRows.length ? routeRows : ["no routes detected"]),
		"RAW OUTPUT",
		...formatRouteRawRows(result.rawOutput, Math.max(0, visibleRows - 6)),
		...previewRows,
	];

	if (fullRows.length <= visibleRows) {
		return fullRows;
	}

	const fixedRows = [
		fullRows[0],
		...(filter
			? [
					`FILTER ${filter} matches=${filteredRoutes.length}/${result.routes.length}`,
				]
			: []),
		...(options.sort
			? [`SORT ${options.sort.key} ${options.sort.direction}`]
			: []),
		"DIAGNOSTICS",
		...(diagnosticRows.length
			? diagnosticRows
			: ["WARN No diagnostics available"]),
		"ROUTES",
	];
	const rawRows = ["RAW OUTPUT", ...formatRouteRawRows(result.rawOutput, 1)];
	const routeBudget = Math.max(
		1,
		visibleRows - fixedRows.length - rawRows.length - previewRows.length,
	);

	return [
		...fixedRows,
		...clipOverflowRows(
			routeRows.length ? routeRows : ["no routes detected"],
			routeBudget,
			"routes",
		),
		...rawRows,
		...previewRows,
	].slice(0, visibleRows);
}

function formatRoutePresetSummary(presets: string[] | undefined): string {
	const visible = presets?.slice(0, 3).filter(Boolean) ?? [];
	return visible.length ? `presets=${visible.join("|")}` : "";
}

export function getRouteClipboardPreview(
	result: RouteTableResult,
	options: {
		filter?: string;
		path?: RoutePathResult;
		sort?: RouteSort;
		view?: RouteDetailView;
	} = {},
): ClipboardPreview | undefined {
	const view = options.view ?? "table";
	if (view === "raw") {
		return createClipboardPreview({
			source: "route-raw",
			label: "route raw output",
			copyText: result.rawOutput,
		});
	}
	if (view === "path") {
		if (!options.path) {
			return undefined;
		}
		return createClipboardPreview({
			source: "route-path",
			label: `route path ${options.path.destination}`,
			copyText: options.path.rawOutput,
		});
	}
	if (view === "diagnostics") {
		const copyText = result.diagnostics
			.map(
				(diagnostic) =>
					`${diagnostic.status.toUpperCase()} ${diagnostic.label}${diagnostic.detail ? ` · ${diagnostic.detail}` : ""}`,
			)
			.join("\n");
		return createClipboardPreview({
			source: "route-diagnostics",
			label: "route diagnostics",
			copyText: copyText || "WARN No diagnostics available",
		});
	}
	return createClipboardPreview({
		source: "route-table",
		label: "route table",
		copyText: formatRouteTable(result, {
			filter: options.filter,
			sort: options.sort,
		}),
	});
}

export function createRouteRawHandoffPlan(
	result: RouteTableResult,
	options: {
		baseDir: string;
		filter?: string;
		generatedAt?: Date;
		path?: RoutePathResult;
		sort?: RouteSort;
		view?: RouteDetailView;
	},
): RouteRawHandoffPlan | undefined {
	const view = options.view ?? "raw";
	const handoff = getRouteHandoffContent(result, {
		filter: options.filter,
		path: options.path,
		sort: options.sort,
		view,
	});
	if (!handoff) {
		return undefined;
	}
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	return {
		path: join(
			options.baseDir,
			"routes",
			`picos-routes-${view}-${iso.replaceAll(/[:.]/g, "")}.md`,
		),
		content: formatRouteHandoffMarkdown(result, {
			content: handoff.content,
			filter: options.filter,
			generatedAt: iso,
			label: handoff.label,
			sort: options.sort,
			view,
		}),
		label: handoff.label,
		view,
	};
}

export async function writeRouteRawHandoffPlan(
	plan: RouteRawHandoffPlan,
): Promise<RouteRawHandoffPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}

function formatRouteDetailViewRows(
	result: RouteTableResult,
	visibleRows: number,
	view: Exclude<RouteDetailView, "table">,
	diagnosticRows: string[],
	path: RoutePathResult | undefined,
	copyPreview: boolean,
): string[] {
	const summary =
		`SUMMARY routes=${result.routes.length} view=${view} command=${result.command} ${result.args.join(" ")}`.trim();
	const previewRows = copyPreview
		? formatRouteClipboardPreviewRows(result, { path, view })
		: [];
	if (view === "raw") {
		return [
			summary,
			"RAW OUTPUT",
			...formatRouteRawRows(
				result.rawOutput,
				Math.max(0, visibleRows - 2 - previewRows.length),
			),
			...previewRows,
		].slice(0, visibleRows);
	}
	if (view === "diagnostics") {
		return [
			summary,
			"DIAGNOSTICS",
			...(diagnosticRows.length
				? diagnosticRows
				: ["WARN No diagnostics available"]),
			...previewRows,
		].slice(0, visibleRows);
	}
	return [
		summary,
		...(path
			? formatRoutePathRows(path, Math.max(0, visibleRows - 1))
			: ["PATH destination lookup: press : then enter host or IP"]),
		...previewRows,
	].slice(0, visibleRows);
}

function formatRouteClipboardPreviewRows(
	result: RouteTableResult,
	options: {
		filter?: string;
		path?: RoutePathResult;
		sort?: RouteSort;
		view?: RouteDetailView;
	},
): string[] {
	const preview = getRouteClipboardPreview(result, options);
	return preview ? formatClipboardPreviewRows(preview) : [];
}

function getRouteHandoffContent(
	result: RouteTableResult,
	options: {
		filter?: string;
		path?: RoutePathResult;
		sort?: RouteSort;
		view: RouteDetailView;
	},
): { content: string; label: string } | undefined {
	if (options.view === "raw") {
		return {
			content: result.rawOutput,
			label: "route raw output",
		};
	}
	if (options.view === "path") {
		if (!options.path) {
			return undefined;
		}
		return {
			content: options.path.rawOutput,
			label: `route path ${options.path.destination}`,
		};
	}
	if (options.view === "diagnostics") {
		return {
			content:
				result.diagnostics
					.map(
						(diagnostic) =>
							`${diagnostic.status.toUpperCase()} ${diagnostic.label}${diagnostic.detail ? ` · ${diagnostic.detail}` : ""}`,
					)
					.join("\n") || "WARN No diagnostics available",
			label: "route diagnostics",
		};
	}
	return {
		content: formatRouteTable(result, {
			filter: options.filter,
			sort: options.sort,
		}),
		label: "route table",
	};
}

function formatRouteHandoffMarkdown(
	result: RouteTableResult,
	options: {
		content: string;
		filter?: string;
		generatedAt: string;
		label: string;
		sort?: RouteSort;
		view: RouteDetailView;
	},
): string {
	const filter = options.filter?.trim() ?? "";
	return [
		"# picos route handoff",
		`generatedAt=${options.generatedAt}`,
		`view=${options.view}`,
		`label=${options.label}`,
		`command=${result.command} ${result.args.join(" ")}`.trim(),
		...(filter ? [`filter=${filter}`] : []),
		...(options.sort
			? [`sort=${options.sort.key} ${options.sort.direction}`]
			: []),
		"",
		"```txt",
		options.content,
		"```",
		"",
	].join("\n");
}

export function formatRouteRawRows(
	rawOutput: string,
	visibleRows: number,
): string[] {
	const lines = rawOutput.split(/\r?\n/).filter((line) => line.length > 0);
	const visible = lines.slice(0, visibleRows);
	const hidden = Math.max(0, lines.length - visible.length);
	return hidden > 0 ? [...visible, `↓ ${hidden} more raw lines`] : visible;
}

export function formatRoutePathRows(
	result: RoutePathResult,
	visibleRows: number,
): string[] {
	const rows = [
		`PATH destination=${result.destination}`,
		`gateway=${result.gateway ?? "-"} interface=${result.interfaceName ?? "-"} source=${result.sourceIp ?? "-"}`,
		"RAW PATH",
		...formatRouteRawRows(result.rawOutput, Math.max(0, visibleRows - 3)),
	];
	return rows.slice(0, visibleRows);
}

function clip(value: string, width: number): string {
	return value.length > width
		? `${value.slice(0, Math.max(0, width - 1))}…`
		: value;
}

function clipOverflowRows(
	rows: string[],
	budget: number,
	label: string,
): string[] {
	if (rows.length <= budget) {
		return rows;
	}
	if (budget <= 1) {
		return [`↓ ${rows.length} more ${label}`];
	}
	const visible = rows.slice(0, budget - 1);
	return [...visible, `↓ ${rows.length - visible.length} more ${label}`];
}
