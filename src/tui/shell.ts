export type ShellLayout = {
	width: number;
	height: number;
	topBarHeight: number;
	contentHeight: number;
	logHeight: number;
	sidebarWidth: number;
	inspectorWidth: number;
	mainWidth: number;
};

export function computeShellLayout(columns: number, rows: number): ShellLayout {
	const width = Math.max(70, columns);
	const height = Math.max(20, rows);
	const topBarHeight = 3;
	const logHeight = height < 30 ? 4 : 6;
	const contentHeight = height - topBarHeight - logHeight;
	const sidebarWidth = width < 90 ? 18 : 24;
	const inspectorWidth = width < 100 ? 0 : 34;
	const mainWidth = width - sidebarWidth - inspectorWidth;

	return {
		width,
		height,
		topBarHeight,
		contentHeight,
		logHeight,
		sidebarWidth,
		inspectorWidth,
		mainWidth,
	};
}

export function formatTopBarLine(
	width: number,
	left: string,
	right: string,
): string {
	if (width <= 0) {
		return "";
	}

	if (left.length >= width) {
		return clipLine(left, width);
	}

	const rightWidth = width - left.length - 1;
	const fittedRight = clipLine(right, rightWidth);
	const gap = Math.max(1, width - left.length - fittedRight.length);

	return `${left}${" ".repeat(gap)}${fittedRight}`.slice(0, width);
}

function clipLine(value: string, width: number): string {
	if (width <= 0) {
		return "";
	}
	if (value.length <= width) {
		return value;
	}
	if (width === 1) {
		return "…";
	}
	return `${value.slice(0, width - 1)}…`;
}
