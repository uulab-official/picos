export type StatusDialogPreviewGroup = {
	kind: string;
	rows: string[];
	promptRows?: string[];
};

const STATUS_DIALOG_DETAIL_PREFIXES = [
	"confirm",
	"url=",
	"path=",
	"from=",
	"to=",
	"reason=",
	"remove ",
	"CONFIG ORIGIN",
	":",
];

export function formatStatusDialogPreviewRows(
	groups: StatusDialogPreviewGroup[],
): string[] {
	const activeGroups = groups.filter((group) => group.rows.length > 0);
	if (activeGroups.length === 0) {
		return [
			"STATUS DIALOG PREVIEW active=none count=0",
			"no pending Status dialog previews",
			"controls=type exact phrase enter=confirm esc=cancel",
		];
	}

	const rows = [
		`STATUS DIALOG PREVIEW active=${activeGroups[0]?.kind ?? "none"} count=${activeGroups.length}`,
		...activeGroups.flatMap((group, index) =>
			formatStatusDialogPreviewGroupRows(group, index === 0),
		),
		"controls=type exact phrase enter=confirm esc=cancel",
	];
	return rows;
}

function formatStatusDialogPreviewGroupRows(
	group: StatusDialogPreviewGroup,
	active: boolean,
): string[] {
	const [title = group.kind, ...detailRows] = group.rows;
	const details = selectStatusDialogDetailRows(
		detailRows,
		group.promptRows ?? [],
	)
		.slice(0, 3)
		.map((row) => `  ${row}`);
	const cursor = active ? ">" : " ";
	return [`${cursor} ${group.kind} ${title}`, ...details];
}

function selectStatusDialogDetailRows(
	detailRows: string[],
	promptRows: string[],
): string[] {
	const rows = [
		findStatusDialogDetailRow(detailRows, ["confirm"]),
		findStatusDialogDetailRow(detailRows, [
			"url=",
			"path=",
			"from=",
			"to=",
			"remove ",
		]),
		...promptRows.filter(isStatusDialogDetailRow),
		findStatusDialogDetailRow(detailRows, ["reason="]),
	].filter((row): row is string => Boolean(row));
	return [...new Set(rows)];
}

function findStatusDialogDetailRow(
	rows: string[],
	prefixes: string[],
): string | undefined {
	return rows.find((row) => prefixes.some((prefix) => row.startsWith(prefix)));
}

function isStatusDialogDetailRow(row: string): boolean {
	return STATUS_DIALOG_DETAIL_PREFIXES.some((prefix) => row.startsWith(prefix));
}
