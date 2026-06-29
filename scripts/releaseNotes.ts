import { buildReleaseNotes } from "../src/core/releaseNotes";

const version = process.argv[2];

if (!version) {
	throw new Error("Usage: bun scripts/releaseNotes.ts <version>");
}

const changelog = await Bun.file("CHANGELOG.md").text();
console.log(buildReleaseNotes({ version, changelog }).trimEnd());
