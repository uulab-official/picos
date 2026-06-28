import { Box, Text } from "ink";
import type React from "react";
import type { NetworkSummary } from "../../core/types";
import { KeyValue } from "../components/KeyValue";

export function Dashboard({
	summary,
}: {
	summary?: NetworkSummary;
}): React.ReactElement {
	const primary = summary?.primaryInterface;

	return (
		<Box flexDirection="column">
			<Text bold>Dashboard</Text>
			<Text color="gray">Live local system/network overview.</Text>
			<Box marginTop={1} flexDirection="column">
				<Text bold>Interfaces</Text>
				{summary?.interfaces.length ? (
					summary.interfaces.map((item) => (
						<Text key={item.name}>
							{item.name === primary?.name ? "> " : "  "}
							{item.name.padEnd(12)} {item.ipv4 ?? item.ipv6 ?? "disconnected"}
						</Text>
					))
				) : (
					<Text> No active interfaces detected.</Text>
				)}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text bold>Details</Text>
				<KeyValue label="IPv4:" value={primary?.ipv4 ?? "-"} />
				<KeyValue label="IPv6:" value={primary?.ipv6 ?? "-"} />
				<KeyValue label="Gateway:" value={summary?.gateway ?? "-"} />
				<KeyValue label="DNS:" value={summary?.dnsServers.join(", ") || "-"} />
				<KeyValue
					label="Public IP:"
					value={summary?.publicIp ?? "loading..."}
				/>
			</Box>
		</Box>
	);
}
