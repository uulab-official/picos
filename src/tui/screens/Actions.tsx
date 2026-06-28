import { Box, Text } from "ink";
import type React from "react";
import { getActionCatalog } from "../../core/actions";

export function Actions(): React.ReactElement {
	const catalog = getActionCatalog();

	return (
		<Box flexDirection="column">
			<Text bold>Action Center</Text>
			<Text color="gray">
				OS-changing actions are modeled, but locked for v0.1.
			</Text>
			<Box marginTop={1} flexDirection="column">
				{catalog.map((action) => (
					<Text key={action.id} color={action.enabled ? "green" : "yellow"}>
						{action.enabled ? "[ready]" : "[locked]"} {action.id.padEnd(18)}{" "}
						{action.risk.padEnd(11)} privilege={action.privilege}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">Rule:</Text>
				<Text>
					write/destructive actions need preview, admin handling, and typed
					confirmation.
				</Text>
			</Box>
		</Box>
	);
}
