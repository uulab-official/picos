import { readConfig } from "../config/store";
import { runPing } from "./command";
import {
	canFetchInternet,
	canResolve,
	getNetworkSummary,
	lookupPublicIp,
} from "./network";
import type { DoctorCheck, NetworkSummary } from "./types";

export type DoctorDependencies = {
	getNetworkSummary: () => Promise<NetworkSummary>;
	canReachGateway: (gateway: string) => Promise<boolean>;
	canResolveDns: () => Promise<boolean>;
	canReachInternet: () => Promise<boolean>;
	canPingDefaultHost: () => Promise<boolean>;
	lookupPublicIp: () => Promise<string | undefined>;
};

export async function runDoctorChecks(
	dependencies?: Partial<DoctorDependencies>,
): Promise<DoctorCheck[]> {
	const deps = await withDefaultDependencies(dependencies);
	const summary = await deps.getNetworkSummary();
	const checks: DoctorCheck[] = [];

	const hasInterface = summary.interfaces.length > 0;
	const hasIpv4 = Boolean(summary.primaryInterface?.ipv4);
	const hasDns = summary.dnsServers.length > 0;

	checks.push(check("Interface detected", hasInterface));
	checks.push(check("IPv4 assigned", hasIpv4));

	if (summary.gateway) {
		checks.push(
			check(
				"Gateway reachable",
				await deps.canReachGateway(summary.gateway),
				summary.gateway,
			),
		);
	} else {
		checks.push({
			label: "Gateway reachable",
			status: "warn",
			detail: "No gateway found",
		});
	}

	checks.push(check("DNS configured", hasDns, summary.dnsServers.join(", ")));
	checks.push(check("DNS resolve ok", await deps.canResolveDns()));
	checks.push(check("Internet reachable", await deps.canReachInternet()));
	checks.push(
		check("Default ping host reachable", await deps.canPingDefaultHost()),
	);

	const publicIp = await deps.lookupPublicIp();
	checks.push(
		publicIp
			? { label: "Public IP lookup", status: "pass", detail: publicIp }
			: { label: "Public IP lookup", status: "warn", detail: "Lookup failed" },
	);

	return checks;
}

function check(label: string, passed: boolean, detail?: string): DoctorCheck {
	return {
		label,
		status: passed ? "pass" : "fail",
		detail,
	};
}

async function withDefaultDependencies(
	dependencies: Partial<DoctorDependencies> = {},
): Promise<DoctorDependencies> {
	const config = await readConfig();

	return {
		getNetworkSummary,
		canReachGateway: async (gateway) =>
			(await runPing(gateway, process.platform, 1)).success,
		canResolveDns: () => canResolve(),
		canReachInternet: canFetchInternet,
		canPingDefaultHost: async () =>
			(await runPing(config.defaultPingHost, process.platform, 1)).success,
		lookupPublicIp,
		...dependencies,
	};
}
