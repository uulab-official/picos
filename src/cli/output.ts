import { ReportedCliError } from "./errors";

export class CliOutputWriteError extends ReportedCliError {
	constructor(cause: unknown) {
		super("Could not write CLI output", { cause });
		this.name = "CliOutputWriteError";
	}
}

export function isCliOutputWriteError(
	caught: unknown,
): caught is CliOutputWriteError {
	return caught instanceof CliOutputWriteError;
}

export async function deliverCliOutput(
	writer: (value: string) => unknown,
	value: string,
): Promise<void> {
	try {
		await writer(value);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		throw new CliOutputWriteError(caught);
	}
}

export async function writeCliOutput(value: string): Promise<void> {
	await deliverCliOutput(writeStdout, value);
}

function writeStdout(value: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		process.stdout.write(`${value}\n`, (error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}
