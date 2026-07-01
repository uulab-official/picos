export type StatusActivityQueueInput = {
	releaseRows?: string[];
	dialogRows?: string[];
	cleanupRows?: string[];
	evidenceRows?: string[];
};

type StatusActivityQueueSource = {
	key: "release" | "dialog" | "cleanup" | "evidence";
	prefix: string;
	rows?: string[];
};

const STATUS_ACTIVITY_QUEUE_SOURCES: StatusActivityQueueSource[] = [
	{
		key: "release",
		prefix: "STATUS RELEASE CONSOLE",
	},
	{
		key: "dialog",
		prefix: "STATUS DIALOG PREVIEW",
	},
	{
		key: "cleanup",
		prefix: "CLEANUP OPS",
	},
	{
		key: "evidence",
		prefix: "STATUS EVIDENCE SUMMARY",
	},
];

const STATUS_ACTIVITY_QUEUE_CONTROLS =
	"controls=Status queue scans release/dialog/cleanup/evidence; open panels for detail";

export function formatStatusActivityQueueRows(
	input: StatusActivityQueueInput,
): string[] {
	const entries = STATUS_ACTIVITY_QUEUE_SOURCES.map((source) => ({
		key: source.key,
		row: getSourceHeader(input, source),
	})).filter(
		(entry): entry is { key: StatusActivityQueueSource["key"]; row: string } =>
			Boolean(entry.row),
	);
	const sources =
		entries.length > 0 ? entries.map((entry) => entry.key).join(",") : "none";
	if (entries.length === 0) {
		return [
			"STATUS ACTIVITY QUEUE active=0 sources=none",
			"no Status activity yet",
			STATUS_ACTIVITY_QUEUE_CONTROLS,
		];
	}
	return [
		`STATUS ACTIVITY QUEUE active=${entries.length} sources=${sources}`,
		...entries.map((entry, index) => {
			const marker = index === 0 ? "> " : "  ";
			return `${marker}${entry.key} ${entry.row}`;
		}),
		STATUS_ACTIVITY_QUEUE_CONTROLS,
	];
}

function getSourceHeader(
	input: StatusActivityQueueInput,
	source: StatusActivityQueueSource,
): string | undefined {
	const rows = getSourceRows(input, source.key);
	return rows.find((row) => row.startsWith(source.prefix));
}

function getSourceRows(
	input: StatusActivityQueueInput,
	source: StatusActivityQueueSource["key"],
): string[] {
	switch (source) {
		case "release":
			return input.releaseRows ?? [];
		case "dialog":
			return input.dialogRows ?? [];
		case "cleanup":
			return input.cleanupRows ?? [];
		case "evidence":
			return input.evidenceRows ?? [];
	}
}
