import { Box, Text } from "ink";
import type React from "react";
import type { NetworkSummary } from "../../core/types";

export function Network({
	summary,
}: {
	summary?: NetworkSummary;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>Network</Text>
			<Text color="gray">
				Read-only adapter state. Control actions stay locked.
			</Text>
			<Box marginTop={1} flexDirection="column">
				{(summary?.interfaces ?? []).map((item) => (
					<Text key={item.name}>
						{item.name}: {item.status} IPv4={item.ipv4 ?? "-"} IPv6=
						{item.ipv6 ?? "-"}
					</Text>
				))}
			</Box>
		</Box>
	);
}
