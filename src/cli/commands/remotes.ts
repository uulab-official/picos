import { readConfig } from "../../config/store";
import { formatRemoteProfiles } from "../../core/remotes";

export async function remotesCommand(): Promise<void> {
	const config = await readConfig();
	console.log(formatRemoteProfiles(config.remoteProfiles));
}
