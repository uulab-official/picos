import type {
	RoutePathResult,
	RouteSort,
	RouteTableResult,
} from "../core/routes";
import { sortRouteEntries } from "../core/routes";

export type RouteDetailView = "table" | "raw" | "diagnostics" | "path";

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

export function formatRouteWorkspaceRows(
	result: RouteTableResult,
	visibleRows: number,
	options: {
		path?: RoutePathResult;
		sort?: RouteSort;
		view?: RouteDetailView;
	} = {},
): string[] {
	const view = options.view ?? "table";
	const routeRows = sortRouteEntries(result.routes, options.sort).map(
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
		);
	}
	const fullRows = [
		`SUMMARY routes=${result.routes.length} command=${result.command} ${result.args.join(" ")}`.trim(),
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
	];

	if (fullRows.length <= visibleRows) {
		return fullRows;
	}

	const fixedRows = [
		fullRows[0],
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
		visibleRows - fixedRows.length - rawRows.length,
	);

	return [
		...fixedRows,
		...clipOverflowRows(
			routeRows.length ? routeRows : ["no routes detected"],
			routeBudget,
			"routes",
		),
		...rawRows,
	].slice(0, visibleRows);
}

function formatRouteDetailViewRows(
	result: RouteTableResult,
	visibleRows: number,
	view: Exclude<RouteDetailView, "table">,
	diagnosticRows: string[],
	path: RoutePathResult | undefined,
): string[] {
	const summary =
		`SUMMARY routes=${result.routes.length} view=${view} command=${result.command} ${result.args.join(" ")}`.trim();
	if (view === "raw") {
		return [
			summary,
			"RAW OUTPUT",
			...formatRouteRawRows(result.rawOutput, Math.max(0, visibleRows - 2)),
		].slice(0, visibleRows);
	}
	if (view === "diagnostics") {
		return [
			summary,
			"DIAGNOSTICS",
			...(diagnosticRows.length
				? diagnosticRows
				: ["WARN No diagnostics available"]),
		].slice(0, visibleRows);
	}
	return [
		summary,
		...(path
			? formatRoutePathRows(path, Math.max(0, visibleRows - 1))
			: ["PATH destination lookup: press : then enter host or IP"]),
	].slice(0, visibleRows);
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
