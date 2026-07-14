import { readConfig } from "../config/store";
import { runPing } from "./command";
import {
	canFetchInternet,
	canResolve,
	getNetworkSummary,
	lookupPublicIp,
} from "./network";
import type { DoctorCheck, DoctorCheckId, NetworkSummary } from "./types";

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

	checks.push(check("interface", "Interface detected", hasInterface));
	checks.push(check("ipv4", "IPv4 assigned", hasIpv4));

	if (summary.gateway) {
		checks.push(
			await booleanCheck(
				"gateway",
				"Gateway reachable",
				() => deps.canReachGateway(summary.gateway as string),
				summary.gateway,
			),
		);
	} else {
		checks.push({
			id: "gateway",
			label: "Gateway reachable",
			status: "warn",
			detail: "No gateway found",
		});
	}

	checks.push(
		check(
			"dns-config",
			"DNS configured",
			hasDns,
			summary.dnsServers.join(", "),
		),
	);
	checks.push(
		await booleanCheck("dns-resolve", "DNS resolve ok", deps.canResolveDns),
	);
	checks.push(
		await booleanCheck("internet", "Internet reachable", deps.canReachInternet),
	);
	checks.push(
		await booleanCheck(
			"default-ping",
			"Default ping host reachable",
			deps.canPingDefaultHost,
		),
	);

	try {
		const publicIp = await deps.lookupPublicIp();
		checks.push(
			publicIp
				? {
						id: "public-ip",
						label: "Public IP lookup",
						status: "pass",
						detail: publicIp,
					}
				: {
						id: "public-ip",
						label: "Public IP lookup",
						status: "warn",
						detail: "Lookup failed",
					},
		);
	} catch (caught) {
		checks.push({
			id: "public-ip",
			label: "Public IP lookup",
			status: "warn",
			detail: errorMessage(caught),
		});
	}

	return checks;
}

function check(
	id: DoctorCheckId,
	label: string,
	passed: boolean,
	detail?: string,
): DoctorCheck {
	return {
		id,
		label,
		status: passed ? "pass" : "fail",
		detail,
	};
}

async function booleanCheck(
	id: DoctorCheckId,
	label: string,
	run: () => Promise<boolean>,
	detail?: string,
): Promise<DoctorCheck> {
	try {
		return check(id, label, await run(), detail);
	} catch (caught) {
		return {
			id,
			label,
			status: "fail",
			detail: errorMessage(caught),
		};
	}
}

function errorMessage(caught: unknown): string {
	return caught instanceof Error ? caught.message : String(caught);
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
