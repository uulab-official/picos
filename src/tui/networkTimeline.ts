import type { NetworkSummary } from "../core/types";
import type { ConsoleEvent } from "./events";
import { createEvent } from "./events";

export function createNetworkTimelineEvents(
	previous: NetworkSummary | undefined,
	next: NetworkSummary,
	time?: string,
): ConsoleEvent[] {
	if (!previous) {
		return [];
	}

	const events: ConsoleEvent[] = [];

	if (previous.status !== next.status) {
		events.push(
			createEvent(
				next.status === "online" ? "ok" : "warn",
				`network status ${previous.status} -> ${next.status}`,
				time,
			),
		);
	}

	const previousPrimary = primaryLabel(previous);
	const nextPrimary = primaryLabel(next);
	if (previousPrimary !== nextPrimary) {
		events.push(
			createEvent(
				"info",
				`network primary ${previousPrimary} -> ${nextPrimary}`,
				time,
			),
		);
	}

	const previousPublicIp = previous.publicIp ?? "-";
	const nextPublicIp = next.publicIp ?? "-";
	if (previousPublicIp !== nextPublicIp) {
		events.push(
			createEvent(
				"info",
				`network public ip ${previousPublicIp} -> ${nextPublicIp}`,
				time,
			),
		);
	}

	for (const name of interfaceNames(previous, next)) {
		const previousAddress = interfaceAddress(previous, name);
		const nextAddress = interfaceAddress(next, name);
		if (previousAddress === nextAddress) {
			continue;
		}
		const level =
			previousAddress === "-" ? "ok" : nextAddress === "-" ? "warn" : "info";
		const suffix =
			nextAddress === "-"
				? `${previousAddress} removed`
				: `${previousAddress} -> ${nextAddress}`;
		events.push(
			createEvent(level, `network interface ${name} ${suffix}`, time),
		);
	}

	return events;
}

function primaryLabel(summary: NetworkSummary): string {
	const primary = summary.primaryInterface;
	if (!primary) {
		return "-";
	}
	return `${primary.name} ${primary.ipv4 ?? primary.ipv6 ?? "-"}`;
}

function interfaceNames(
	previous: NetworkSummary,
	next: NetworkSummary,
): string[] {
	return [
		...new Set([
			...previous.interfaces.map((item) => item.name),
			...next.interfaces.map((item) => item.name),
		]),
	].sort((left, right) =>
		left.localeCompare(right, undefined, {
			numeric: true,
			sensitivity: "base",
		}),
	);
}

function interfaceAddress(summary: NetworkSummary, name: string): string {
	const item = summary.interfaces.find((candidate) => candidate.name === name);
	return item ? addressLabel(item.ipv4, item.ipv6) : "-";
}

function addressLabel(
	ipv4: string | undefined,
	ipv6: string | undefined,
): string {
	return [ipv4, ipv6].filter(Boolean).join(",") || "-";
}
