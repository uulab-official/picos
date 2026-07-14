#!/usr/bin/env node
import { runCli } from "../cli";
import { isReportedCliError } from "../cli/errors";

runCli().catch((error) => {
	if (!isReportedCliError(error)) {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
