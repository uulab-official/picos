import type { Language } from "../core/types";

export const supportedLanguages = ["en", "ko", "ja", "zh"] as const;

type TranslationKey =
	| "app.subtitle"
	| "app.controls"
	| "app.workspaces"
	| "app.keys.move"
	| "app.keys.switch"
	| "screen.dashboard"
	| "screen.system"
	| "screen.hardware"
	| "screen.storage"
	| "screen.processes"
	| "screen.interfaces"
	| "screen.network"
	| "screen.routes"
	| "screen.connections"
	| "screen.ports"
	| "screen.tools"
	| "screen.networkTools"
	| "screen.timeline"
	| "screen.dns"
	| "screen.actions"
	| "screen.status"
	| "screen.logs"
	| "dashboard.systemLink"
	| "dashboard.primaryInterface"
	| "dashboard.doctorSnapshot"
	| "dashboard.runDoctorHint"
	| "actions.title"
	| "actions.hint"
	| "events.title"
	| "events.booted"
	| "events.lockedPolicy"
	| "inspector.title"
	| "inspector.workspace"
	| "status.roadmap"
	| "status.version";

const translations: Record<Language, Record<TranslationKey, string>> = {
	en: {
		"app.subtitle":
			"tiny terminal OS · d doctor · p ping · r refresh · enter run · q quit",
		"app.controls": "tiny terminal OS",
		"app.workspaces": "WORKSPACES",
		"app.keys.move": "j/k move",
		"app.keys.switch": "h/l switch",
		"screen.dashboard": "Dashboard",
		"screen.system": "System",
		"screen.hardware": "Hardware",
		"screen.storage": "Storage",
		"screen.processes": "Processes",
		"screen.interfaces": "Interfaces",
		"screen.network": "Network",
		"screen.routes": "Routes",
		"screen.connections": "Connections",
		"screen.ports": "Ports",
		"screen.tools": "Tools",
		"screen.networkTools": "Network Tools",
		"screen.timeline": "Timeline",
		"screen.dns": "DNS",
		"screen.actions": "Actions",
		"screen.status": "Status",
		"screen.logs": "Logs",
		"dashboard.systemLink": "SYSTEM LINK",
		"dashboard.primaryInterface": "PRIMARY INTERFACE",
		"dashboard.doctorSnapshot": "DOCTOR SNAPSHOT",
		"dashboard.runDoctorHint": "Press d to run doctor.",
		"actions.title": "Action Center",
		"actions.hint": "j/k selects · enter runs read-only actions",
		"events.title": "EVENT LOG · : ready",
		"events.booted": "picos console booted",
		"events.lockedPolicy": "write actions locked by policy",
		"inspector.title": "INSPECTOR",
		"inspector.workspace": "workspace",
		"status.roadmap": "Roadmap",
		"status.version": "Version",
	},
	ko: {
		"app.subtitle":
			"작은 터미널 OS · d 진단 · p 핑 · r 새로고침 · enter 실행 · q 종료",
		"app.controls": "작은 터미널 OS",
		"app.workspaces": "작업공간",
		"app.keys.move": "j/k 이동",
		"app.keys.switch": "h/l 전환",
		"screen.dashboard": "대시보드",
		"screen.system": "시스템",
		"screen.hardware": "하드웨어",
		"screen.storage": "스토리지",
		"screen.processes": "프로세스",
		"screen.interfaces": "인터페이스",
		"screen.network": "네트워크",
		"screen.routes": "라우트",
		"screen.connections": "연결",
		"screen.ports": "포트",
		"screen.tools": "도구",
		"screen.networkTools": "네트워크 도구",
		"screen.timeline": "타임라인",
		"screen.dns": "DNS",
		"screen.actions": "액션",
		"screen.status": "상태",
		"screen.logs": "로그",
		"dashboard.systemLink": "시스템 연결",
		"dashboard.primaryInterface": "주 인터페이스",
		"dashboard.doctorSnapshot": "진단 요약",
		"dashboard.runDoctorHint": "d를 눌러 진단을 실행하세요.",
		"actions.title": "액션 센터",
		"actions.hint": "j/k 선택 · enter 읽기 액션 실행",
		"events.title": "이벤트 로그 · : 준비",
		"events.booted": "picos 콘솔 시작",
		"events.lockedPolicy": "쓰기 액션은 정책상 잠김",
		"inspector.title": "검사기",
		"inspector.workspace": "작업공간",
		"status.roadmap": "로드맵",
		"status.version": "버전",
	},
	ja: {
		"app.subtitle":
			"小さなターミナルOS · d 診断 · p ping · r 更新 · enter 実行 · q 終了",
		"app.controls": "小さなターミナルOS",
		"app.workspaces": "ワークスペース",
		"app.keys.move": "j/k 移動",
		"app.keys.switch": "h/l 切替",
		"screen.dashboard": "ダッシュボード",
		"screen.system": "システム",
		"screen.hardware": "ハードウェア",
		"screen.storage": "ストレージ",
		"screen.processes": "プロセス",
		"screen.interfaces": "インターフェース",
		"screen.network": "ネットワーク",
		"screen.routes": "ルート",
		"screen.connections": "接続",
		"screen.ports": "ポート",
		"screen.tools": "ツール",
		"screen.networkTools": "ネットワークツール",
		"screen.timeline": "タイムライン",
		"screen.dns": "DNS",
		"screen.actions": "アクション",
		"screen.status": "状態",
		"screen.logs": "ログ",
		"dashboard.systemLink": "システム接続",
		"dashboard.primaryInterface": "主インターフェース",
		"dashboard.doctorSnapshot": "診断サマリー",
		"dashboard.runDoctorHint": "dで診断を実行します。",
		"actions.title": "アクションセンター",
		"actions.hint": "j/k 選択 · enter 読み取りアクション実行",
		"events.title": "イベントログ · : 準備完了",
		"events.booted": "picos コンソール起動",
		"events.lockedPolicy": "書き込みアクションはロック中",
		"inspector.title": "インスペクター",
		"inspector.workspace": "ワークスペース",
		"status.roadmap": "ロードマップ",
		"status.version": "バージョン",
	},
	zh: {
		"app.subtitle":
			"小型终端OS · d 诊断 · p ping · r 刷新 · enter 运行 · q 退出",
		"app.controls": "小型终端OS",
		"app.workspaces": "工作区",
		"app.keys.move": "j/k 移动",
		"app.keys.switch": "h/l 切换",
		"screen.dashboard": "仪表盘",
		"screen.system": "系统",
		"screen.hardware": "硬件",
		"screen.storage": "存储",
		"screen.processes": "进程",
		"screen.interfaces": "接口",
		"screen.network": "网络",
		"screen.routes": "路由",
		"screen.connections": "连接",
		"screen.ports": "端口",
		"screen.tools": "工具",
		"screen.networkTools": "网络工具",
		"screen.timeline": "时间线",
		"screen.dns": "DNS",
		"screen.actions": "操作",
		"screen.status": "状态",
		"screen.logs": "日志",
		"dashboard.systemLink": "系统连接",
		"dashboard.primaryInterface": "主接口",
		"dashboard.doctorSnapshot": "诊断摘要",
		"dashboard.runDoctorHint": "按 d 运行诊断。",
		"actions.title": "操作中心",
		"actions.hint": "j/k 选择 · enter 运行只读操作",
		"events.title": "事件日志 · : 就绪",
		"events.booted": "picos 控制台已启动",
		"events.lockedPolicy": "写入操作已按策略锁定",
		"inspector.title": "检查器",
		"inspector.workspace": "工作区",
		"status.roadmap": "路线图",
		"status.version": "版本",
	},
};

export function isSupportedLanguage(value: string): value is Language {
	return supportedLanguages.includes(value as Language);
}

export function translate(language: Language, key: string): string {
	const typedKey = key as TranslationKey;
	return translations[language][typedKey] ?? translations.en[typedKey] ?? key;
}

export function createTranslator(language: Language): (key: string) => string {
	return (key) => translate(language, key);
}
