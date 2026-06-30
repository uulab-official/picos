export type RoadmapItem = {
	label: string;
	status: "done" | "active" | "next" | "locked";
};

export function getRoadmapItems(): RoadmapItem[] {
	return [
		{ label: "Bun/TypeScript package scaffold", status: "done" },
		{
			label: "CLI commands for info, doctor, ping, DNS, config",
			status: "done",
		},
		{ label: "Keyboard-driven TUI shell", status: "active" },
		{ label: "Action permission and confirmation model", status: "active" },
		{ label: "OS-grade system inventory", status: "active" },
		{ label: "Ping, telnet alias, and TCP connect tool", status: "active" },
		{
			label: "Routes, ports, connections, timeline, and preset-aware tools",
			status: "active",
		},
		{ label: "DOS-style file manager and text editor", status: "next" },
		{
			label: "Privileged control previews and confirmations",
			status: "active",
		},
		{ label: "Plugin system for Docker, SSH, logs, monitor", status: "locked" },
	];
}

export function getSupportedPlatformLabels(): string[] {
	return ["macOS", "Linux", "Windows"];
}
