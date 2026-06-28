import { describe, expect, test } from "bun:test";
import {
	isSupportedLanguage,
	supportedLanguages,
	translate,
} from "../src/i18n/catalog";

describe("i18n catalog", () => {
	test("supports the base language set", () => {
		expect(supportedLanguages).toEqual(["en", "ko", "ja", "zh"]);
		expect(isSupportedLanguage("en")).toBeTrue();
		expect(isSupportedLanguage("ko")).toBeTrue();
		expect(isSupportedLanguage("ja")).toBeTrue();
		expect(isSupportedLanguage("zh")).toBeTrue();
		expect(isSupportedLanguage("fr")).toBeFalse();
	});

	test("translates core console labels", () => {
		expect(translate("en", "screen.dashboard")).toBe("Dashboard");
		expect(translate("ko", "screen.dashboard")).toBe("대시보드");
		expect(translate("ja", "screen.dashboard")).toBe("ダッシュボード");
		expect(translate("zh", "screen.dashboard")).toBe("仪表盘");
		expect(translate("ko", "screen.ports")).toBe("포트");
		expect(translate("ja", "screen.routes")).toBe("ルート");
		expect(translate("zh", "screen.timeline")).toBe("时间线");
	});

	test("falls back to English when a key is missing", () => {
		expect(translate("ko", "missing.key")).toBe("missing.key");
	});
});
