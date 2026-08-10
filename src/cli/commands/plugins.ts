import {
	collectDeveloperPlugin,
	formatDeveloperPluginCatalogRows,
	formatDeveloperPluginSnapshotRows,
	getDeveloperPluginCatalog,
	parseDeveloperPluginId,
} from "../../core/plugins";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";
import {
	formatPluginCatalogJson,
	formatPluginSnapshotJson,
} from "../pluginOutput";

export async function pluginsCommand(
	id?: string,
	options: { json?: unknown } = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		if (!id) {
			const catalog = getDeveloperPluginCatalog();
			await writeCliOutput(
				json
					? formatPluginCatalogJson(catalog)
					: formatDeveloperPluginCatalogRows(catalog).join("\n"),
			);
			return;
		}

		const pluginId = parseDeveloperPluginId(id);
		const snapshot = await collectDeveloperPlugin(pluginId);
		await writeCliOutput(
			json
				? formatPluginSnapshotJson(snapshot)
				: formatDeveloperPluginSnapshotRows(snapshot).join("\n"),
		);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("plugins", caught, {
				request: { action: id ? "inspect" : "list", id: id ?? null },
			});
		}
		throw caught;
	}
}
