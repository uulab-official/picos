import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type DockerFixtureMode = "completed" | "partial";

export type DockerFixture = {
	environment: NodeJS.ProcessEnv;
	cleanup(): Promise<void>;
};

export async function createDockerFixture(
	mode: DockerFixtureMode,
): Promise<DockerFixture> {
	const directory = await mkdtemp(join(tmpdir(), "picos-docker-fixture-"));
	const windows = process.platform === "win32";
	const executable = join(directory, windows ? "docker.cmd" : "docker");

	try {
		await writeFile(
			executable,
			windows ? WINDOWS_DOCKER_FIXTURE : POSIX_DOCKER_FIXTURE,
			"utf8",
		);
		if (!windows) await chmod(executable, 0o755);
	} catch (caught) {
		await rm(directory, { recursive: true, force: true });
		throw caught;
	}

	return {
		environment: {
			PATH: directory,
			Path: directory,
			PICOS_DOCKER_FIXTURE_MODE: mode,
		},
		cleanup: () => rm(directory, { recursive: true, force: true }),
	};
}

const POSIX_DOCKER_FIXTURE = `#!/bin/sh
case "$1:$2" in
  --version:*)
    printf '%s\\n' 'Docker version 28.3.0, build fixture'
    ;;
  context:show)
    printf '%s\\n' 'fixture-context'
    ;;
  info:--format)
    case "$PICOS_DOCKER_FIXTURE_MODE" in
      partial)
        printf '%s\\n' 'Cannot connect to the Docker daemon token=fixture-secret' >&2
        exit 1
        ;;
    esac
    printf '%s\\n' '28.3.0\t3\t1\t1\t1\t12'
    ;;
  ps:--all)
    case "$PICOS_DOCKER_FIXTURE_MODE" in
      partial)
        printf '%s\\n' 'Cannot connect to the Docker daemon token=fixture-secret' >&2
        exit 1
        ;;
    esac
    printf '%s\\n' 'f7e8d9c0b1a2\tfixture-api\tfixture/api:1.0\trunning\tUp 5 minutes'
    printf '%s\\n' 'a1b2c3d4e5f6\tfixture-worker\tfixture/worker:1.0\texited\tExited (0) 2 minutes ago'
    ;;
  *)
    printf '%s\\n' 'unexpected Docker fixture arguments' >&2
    exit 64
    ;;
esac
`;

const WINDOWS_DOCKER_FIXTURE = `@echo off\r\nif "%~1"=="--version" goto version\r\nif "%~1"=="context" if "%~2"=="show" goto context\r\nif "%~1"=="info" if "%~2"=="--format" goto info\r\nif "%~1"=="ps" if "%~2"=="--all" goto ps\r\ngoto unknown\r\n:version\r\necho Docker version 28.3.0, build fixture\r\nexit /b 0\r\n:context\r\necho fixture-context\r\nexit /b 0\r\n:info\r\nif "%PICOS_DOCKER_FIXTURE_MODE%"=="partial" goto partial\r\necho 28.3.0\t3\t1\t1\t1\t12\r\nexit /b 0\r\n:ps\r\nif "%PICOS_DOCKER_FIXTURE_MODE%"=="partial" goto partial\r\necho f7e8d9c0b1a2\tfixture-api\tfixture/api:1.0\trunning\tUp 5 minutes\r\necho a1b2c3d4e5f6\tfixture-worker\tfixture/worker:1.0\texited\tExited (0) 2 minutes ago\r\nexit /b 0\r\n:partial\r\n>&2 echo Cannot connect to the Docker daemon token=fixture-secret\r\nexit /b 1\r\n:unknown\r\n>&2 echo unexpected Docker fixture arguments\r\nexit /b 64\r\n`;
