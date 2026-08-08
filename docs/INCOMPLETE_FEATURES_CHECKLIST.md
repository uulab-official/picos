# 미비 기능 진행 체크리스트

기준일: 2026-08-08

상태 표기: `완료` / `진행 중` / `대기` / `차단`

## 1. 현재 상태 정리

- [x] 상태: 완료 — OS mutation은 읽기 전용/잠금 preview 경계로 유지하고, 파일 작업만 `editorSaveMode=local-write` opt-in 예외로 확정
- [x] 상태: 완료 — 이미 구현된 Logs, SFTP read, Operations preset, Routes/Ports/Connections, Timeline을 미비 기능에서 제외
- [x] 상태: 완료 — 실제 OS 변경과 단순 placeholder/dead code를 구분
- [x] 상태: 완료 — 의존성 설치 후 `git diff --check`와 `bun run verify` 통과(87개 파일, 853개 테스트, lint/typecheck/build/smoke 및 local JSON·diagnostics JSON·operations JSON·automation presets·SFTP harness)

## 2. CLI 자동화 범위

- [x] 상태: 완료 — `locations --json` bounded schema 및 redaction 테스트
- [x] 상태: 완료 — `drives --json` bounded schema 및 redaction 테스트
- [x] 상태: 완료 — `remotes --json` configured profile 목록 schema 및 private-key path 비노출 테스트
- [x] 상태: 완료 — `release-health --json` schema 및 실패 exit 상태 처리
- [x] 상태: 완료 — `info`, `routes`, `route`, `connections`, `ports`, `process` JSON 자동화 및 bounded/redacted subprocess harness
- [x] 상태: 완료 — `monitor`, `logs`, `operations` JSON 자동화, bounded sampling 및 preset harness
- [x] 상태: 완료 — `doctor`, `dns`, `tools` JSON 자동화 및 diagnostics harness
- [x] 상태: 완료 — `handoffs --json` index/archive 자동화 및 path redaction/bounds
- [x] 상태: 완료 — README와 CLI help에 JSON 계약 추가
- [x] 완료 조건 — 각 명령이 stdout에 하나의 versioned JSON 문서만 출력하고, 경로/자격증명을 안전하게 정제하며, 실패 exit 상태를 보존하도록 구현

## 3. 안전한 쓰기 기능

- [x] 상태: 완료 — Editor local-write는 opt-in 정책, exact confirmation, provider guard, audit result, 회귀 테스트가 이미 구현됨
- [x] 상태: 완료 — core local copy/move/delete 실행 계획·provider adapter·안전 테스트와 TUI destination 입력·exact confirmation·dispatch 연결 완료; `editorSaveMode=local-write`일 때만 실행되며 기본값은 계속 차단
- [x] 상태: 완료 — clipboard write는 macOS/Linux/Windows adapter, stdin 실행, exact confirmation, fallback hint, 실패 테스트가 이미 구현됨
- [ ] 상태: 대기 — SFTP remote write/delete/exec는 별도 위험 검토 후 결정
- [ ] 완료 조건 — 모든 OS 변경은 action, risk, privilege, preview, exact confirmation, adapter command, locked/default 테스트를 갖춤

## 4. OS mutation

- [ ] 상태: 대기 — DNS 변경/flush 실행 정책
- [ ] 상태: 대기 — interface enable/disable 실행 정책
- [ ] 상태: 대기 — route add 및 service restart 실행 정책
- [ ] 상태: 대기 — process terminate 실행 정책
- [ ] 완료 조건 — 기본값은 계속 잠금이며, opt-in 정책·권한·dry-run·감사 로그·실패 복구를 모두 검증

## 5. 개발자 환경 확장

- [ ] 상태: 대기 — plugin registry 설계 및 capability contract
- [ ] 상태: 대기 — Docker read-only plugin
- [ ] 상태: 대기 — SSH profile inventory
- [ ] 완료 조건 — 플러그인이 core/TUI/CLI 경계를 침범하지 않고, 지원하지 않는 환경에서 partial 상태를 표시

## 6. 구조 및 품질

- [x] 상태: 완료 — Files path/history 이동, `clampIndex()` 기반 selection, open/preview·clipboard·operation guard, filter/input notice를 순수 TUI 전이로 분리하고 listing/preview에 독립 request sequence를 적용해 stale 성공·실패의 현재 상태 publish를 차단
- [x] 상태: 완료 — Tools target shelf는 `clampIndex()` 기반 selected-preset resolver로 빈 shelf와 범위 밖 selection을 `0`/no-item으로 복구하고, 저장·편집·pin·삭제·cleanup·run intent 및 정확한 notice를 `toolHistory.ts` 순수 전이로 분리 완료
- [x] 상태: 완료 — TypeScript AST callback audit가 `App.tsx`의 `useCallback` 154개와 `useInput` dispatcher 1개를 inventory/manifest로 검증하며, strict audit는 남은 inline decision을 실패로 보고함
- [x] 상태: 완료 — Editor append/insert/replace/delete/undo와 cursor 이동을 `editorBuffer.ts` 순수 전이로 분리하고, cursor repair·no-op·notice를 단위 테스트로 검증 완료
- [x] 상태: 완료 — 파일 작업 dialog launch·provider guard·active input·destination·confirmation·command-line 전이를 `fileOperationDialog.ts`에서 소유하고 빈 selection/parent/SFTP read-only 회귀 테스트를 보강
- [x] 상태: 완료 — Config session/edit/reset, managed shelf landing·focus·jump, cleanup-history reopen 및 Palette input을 순수 전이로 분리하고 Config I/O의 공유 status count begin/end를 `finally`에서 정확히 쌍으로 유지
- [x] 상태: 완료 — Routes·Connections·Ports·Timeline·Logs의 filter/cleanup/section shortcut/selection/preset/notice 전이를 panel 모듈로 분리하고, endpoint 공유 binding table에서 화면별 intent를 파생하며 모든 selection/refresh repair와 Timeline newest 선택을 `clampIndex()` 기반 helper로 통일
- [x] 상태: 완료 — 사용되지 않는 `src/tui/screens/*` legacy placeholder 6개 제거; 실제 workspace 경로는 `App.tsx`에 있으며 `src/tui` 순수 모듈이 상태 전이를 담당
- [x] 상태: 완료 — `src/core/roadmap.ts`, README, CHANGELOG, LOCAL_AUTOMATION의 구현 상태 동기화
- [x] 상태: 완료 — `package.json`과 `src/core/version.ts`는 `0.2.0`으로 동기화되고 release check가 통과함. ROADMAP의 v0.4.340~346은 공개 버전을 자동 변경하지 않는 개발 slice이며, npm 미게시·원격 태그 없음 상태에서 실제 공개 버전 선택은 maintainer release 절차로 유지
- [x] 완료 조건 — `bun run verify`, lint, typecheck, build, smoke 및 지원 harness가 통과

## 우선순위

1. App.tsx 구조 및 테스트 공백
2. plugin registry와 Docker/SSH 확장
3. 실제 OS mutation 정책 및 구현
4. SFTP remote write 위험 검토
