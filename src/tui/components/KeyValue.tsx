import { Box, Text } from "ink";
import type React from "react";

export function KeyValue({
	label,
	value,
}: {
	label: string;
	value: string;
}): React.ReactElement {
	return (
		<Box>
			<Box width={14}>
				<Text color="cyan">{label}</Text>
			</Box>
			<Text>{value}</Text>
		</Box>
	);
}
