import { readConfig } from "../../config/store";
import {
	formatRemoteProfiles,
	formatRemoteProviderStatus,
} from "../../core/remotes";

export async function remotesCommand(): Promise<void> {
	const config = await readConfig();
	console.log(formatRemoteProfiles(config.remoteProfiles));
}

export async function remoteCommand(id: string): Promise<void> {
	const config = await readConfig();
	const profile = config.remoteProfiles.find((item) => item.id === id);
	if (!profile) {
		throw new Error(`Unknown remote profile: ${id}`);
	}

	console.log(await formatRemoteProviderStatus(profile));
}
