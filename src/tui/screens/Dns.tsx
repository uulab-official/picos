import { Box, Text } from "ink";
import type React from "react";
import type { NetworkSummary } from "../../core/types";

export function Dns({
	summary,
}: {
	summary?: NetworkSummary;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>DNS</Text>
			<Text color="gray">
				Resolver visibility now, mutation controls later.
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>
					Servers:{" "}
					{summary?.dnsServers.length ? summary.dnsServers.join(", ") : "-"}
				</Text>
				<Text color="yellow">
					dns.flush is locked until preview/confirm is wired.
				</Text>
			</Box>
		</Box>
	);
}
