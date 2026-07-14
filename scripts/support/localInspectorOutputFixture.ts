import { formatConnectionsJson } from "../../src/cli/localInspectorOutput";
import { writeCliOutput } from "../../src/cli/output";

const address = "2001:db8:".padEnd(250, "a");
const connections = Array.from({ length: 10_000 }, (_, index) => ({
	protocol: "tcp6",
	localAddress: address,
	localPort: String(index),
	remoteAddress: address,
	remotePort: "443",
	state: "ESTABLISHED",
}));

await writeCliOutput(
	formatConnectionsJson(
		{
			command: "fixture-netstat",
			args: ["-an"],
			connections,
			rawOutput: "",
			success: true,
			exitCode: 0,
			truncated: false,
		},
		{ sort: { key: "localPort", direction: "asc" } },
	),
);
