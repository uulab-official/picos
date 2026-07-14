import { describe, expect, test } from "bun:test";
import { deliverCliOutput, isCliOutputWriteError } from "../src/cli/output";

describe("CLI output delivery", () => {
	test("awaits asynchronous writers", async () => {
		const output: string[] = [];
		await deliverCliOutput(async (value) => {
			await Promise.resolve();
			output.push(value);
		}, "document");

		expect(output).toEqual(["document"]);
	});

	test("classifies writer failures as already reported", async () => {
		let caught: unknown;
		try {
			await deliverCliOutput(() => {
				throw new Error("stdout closed");
			}, "document");
		} catch (error) {
			caught = error;
		}

		expect(isCliOutputWriteError(caught)).toBeTrue();
		expect(caught).toMatchObject({
			message: "Could not write CLI output",
			reported: true,
		});
	});
});
