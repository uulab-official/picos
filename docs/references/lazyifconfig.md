# lazyifconfig Reference Notes

Source: https://github.com/choihunchul/lazyifconfig

`lazyifconfig` is a terminal UI for inspecting local network state. It combines interfaces, subnets, routes, connections, ports, public IP data, events, and tools into one TUI.

## Useful Ideas For picos

- Interface inventory with status, type, MAC, MTU, IPv4/IPv6, gateways, and counters.
- Network grouping by subnet so LAN, loopback, VPN, container, link-local, public, and unassigned networks are easy to scan.
- Connections view based on active local/remote endpoints.
- Ports view with listening ports, summary/detail panes, process metadata, and guarded kill/restart actions.
- Route Inspector with default routes, route diagnostics, VPN hints, and raw route output.
- Destination path lookup for a target host/IP.
- Timeline for local in-app events such as interface changes, address changes, public IP changes, copy actions, and update checks.
- Tools Hub for DNS lookup, Whois/RDAP, IP information, TCP port check, TLS inspection, ping, and traceroute.
- Raw output viewer so summarized views can be compared to source command output.
- Versioned JSON snapshots so local interface, route, connection, and port state can be consumed safely by scripts and coding agents without dumping raw OS output.
- Explicit privacy posture: local command output is parsed locally and not uploaded by the app.

## picos Adaptation

picos should not clone lazyifconfig feature-for-feature. picos is broader: a tiny terminal OS for developers. The immediate adaptation is:

- Add picos workspaces for Routes, Ports, Connections, Timeline, and Tools.
- Add action metadata for read-only route/port/connection/tool inspections.
- Keep dangerous actions locked behind the picos permission model.
- Keep raw command output and timeline concepts as first-class future modules.
- Document privacy guarantees before external lookup features expand.

## Initial Priority

1. Route Inspector skeleton and route action metadata.
2. Ports and Connections workspace skeletons.
3. Tools Hub action list for DNS, ping, traceroute, port check, TLS, Whois/RDAP, and IP info.
4. Timeline event export design.
5. Raw output viewer design.
