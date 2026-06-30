export type ConfigCleanupPreviewInput = {
	id: string;
	label: string;
	scope: string;
	count: number;
	verb?: string;
};

export type ConfigCleanupPreview = {
	id: string;
	label: string;
	scope: string;
	count: number;
	verb: string;
	confirmationPhrase: string;
	rows: string[];
};

export type ConfigCleanupConfirmation = {
	confirmed: boolean;
	message: string;
	preview: ConfigCleanupPreview;
};

export function createConfigCleanupPreview(
	input: ConfigCleanupPreviewInput,
): ConfigCleanupPreview {
	const verb = input.verb?.trim() || "delete";
	const scope = input.scope.trim();
	const count = Math.max(0, Math.floor(input.count));
	const confirmationPhrase = `${verb} ${scope}`;
	return {
		id: input.id,
		label: input.label,
		scope,
		count,
		verb,
		confirmationPhrase,
		rows: [
			"CONFIG CLEANUP",
			`target=${input.label}`,
			`scope=${scope} count=${count}`,
			`confirm ${confirmationPhrase} locked`,
		],
	};
}

export function submitConfigCleanupConfirmation(
	preview: ConfigCleanupPreview,
	confirmation: string,
): ConfigCleanupConfirmation {
	const confirmed = confirmation.trim() === preview.confirmationPhrase;
	return {
		confirmed,
		message: confirmed
			? `config cleanup confirmed ${preview.id} (${preview.count} items)`
			: `config cleanup rejected ${preview.id}`,
		preview,
	};
}
