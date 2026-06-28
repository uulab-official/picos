import { Box, Text } from "ink";
import type React from "react";

export function Logs(): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>Logs</Text>
			<Text color="gray">Runtime event stream placeholder.</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>[boot] picos TUI started</Text>
				<Text>[safe] write actions disabled by default</Text>
				<Text>[next] action audit log will appear here</Text>
			</Box>
		</Box>
	);
}
