import { Box, Text } from "ink";
import type React from "react";
import { getActionSummary } from "../../core/actions";
import {
	getRoadmapItems,
	getSupportedPlatformLabels,
} from "../../core/roadmap";
import { VERSION } from "../../core/version";

const statusIcon = {
	done: "[x]",
	active: "[~]",
	next: "[ ]",
	locked: "[-]",
};

export function Status(): React.ReactElement {
	const actionSummary = getActionSummary();

	return (
		<Box flexDirection="column">
			<Text bold>Status</Text>
			<Text>Version: {VERSION}</Text>
			<Text>Platforms: {getSupportedPlatformLabels().join(", ")}</Text>
			<Text>
				Actions: {actionSummary.enabled}/{actionSummary.total} ready,{" "}
				{actionSummary.locked} locked, {actionSummary.elevated} elevated
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text bold>Roadmap</Text>
				{getRoadmapItems().map((item) => (
					<Text key={item.label}>
						{statusIcon[item.status]} {item.label}
					</Text>
				))}
			</Box>
		</Box>
	);
}
