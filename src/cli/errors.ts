export class ReportedCliError extends Error {
	readonly reported = true;

	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "ReportedCliError";
	}
}

export function isReportedCliError(
	caught: unknown,
): caught is ReportedCliError {
	return (
		caught instanceof ReportedCliError ||
		(caught instanceof Error &&
			"reported" in caught &&
			caught.reported === true)
	);
}
