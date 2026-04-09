# Qufox Tetris — AI Coding Agent Guide

이 문서는 AI 코딩 에이전트(Claude Code, Codex 등)가 이 프로젝트를 효과적으로 개발할 수
있도록 테스트 하네스, CI, 개발 환경을 안내합니다.

---

## Quick Start

```bash
npm ci                          # 의존성 설치
npm run dev                     # 개발 서버 (port 8080)
npm run server:dev              # 게임 서버 (port 3031, 별도 터미널)
npm test                        # 유닛 테스트
npm run test:e2e                # E2E 테스트 (독립 포트 9090)
npm run test:all                # 유닛 + E2E 전체
```

---

## 프로젝트 개요

- **Phaser 3** 기반 웹 테트리스 게임 (TypeScript + webpack)
- **서버 권위(Server-authoritative)** 설계: 클라이언트 입력 → 서버 시뮬레이션 → 스냅샷 동기화
- **듀얼 모드**: 1v1 Duel (auth 기반) + N-Multi (100인 배틀로얄)
- **네트워킹**: Socket.IO (`/server` path)

---

## 아키텍처

### 장면(Scene) 흐름

```
MenuScene → LobbyScene → PlayScene (1v1)
                  → NMultiLobbyScene → NMultiPlayScene (N-Multi)
```

- `BaseScene`: 배경 애니메이션, 반응형 리사이징
- `BasePlayScene`: 1v1/N-Multi 공통 게임 로직

### 핵심 컴포넌트

| 파일 | 역할 |
|------|------|
| `src/tetris/engine.ts` | PlayField, TetrominoBox, LevelIndicator 중재 |
| `src/tetris/objects/playField.ts` | 게임 보드 로직 (10x20 그리드) |
| `src/tetris/objects/tetromino.ts` | 테트리미노 객체 |
| `src/tetris/objects/tetrominoBox.ts` | HOLD 박스 |
| `src/tetris/objects/tetrominoBoxQueue.ts` | NEXT 큐 (6개) |
| `src/tetris/objects/levelIndicator.ts` | 점수/레벨 HUD |
| `src/tetris/objects/miniPlayField.ts` | N-Multi 상대 필드 |

### 비즈니스 로직

| 파일 | 역할 |
|------|------|
| `src/tetris/logic/gameRules.ts` | 회전/킥 규칙 (SRS) |
| `src/tetris/logic/scoreSystem.ts` | 점수 계산 |
| `src/tetris/logic/garbageGenerator.ts` | 쓰레기 라인 생성 |
| `src/tetris/logic/botManager.ts` | 봇 AI |

### 네트워킹

| 파일 | 역할 |
|------|------|
| `server/index.ts` | Socket.IO 서버 (port 3031) |
| `src/tetris/net/socketUtils.ts` | 소켓 URL 유틸리티 |
| `src/tetris/net/boardCodec.ts` | 보드 인코딩 (200-char string, 10x20) |
| `src/tetris/net/snapshotManager.ts` | 스냅샷 상태 관리 |
| `src/tetris/net/joinUrl.ts` | URL 기반 방 참여 라우팅 |
| `src/shared/types/socketPayloads.ts` | 소켓 페이로드 타입 + 타입 가드 |
| `src/shared/core/authoritativeMatch.ts` | 서버 권위 매치 시뮬레이션 |

### UI

| 파일 | 역할 |
|------|------|
| `src/tetris/ui/gameLayout.ts` | 레이아웃 계산 (`desktop`/`mobile-portrait`/`mobile-landscape`) |
| `src/tetris/ui/uiStyles.ts` | UI 스타일 상수 |
| `src/tetris/ui/kenneyButton.ts` | Kenney 버튼 시각 |
| `src/tetris/ui/inGameMenu.ts` | 인게임 메뉴 (네이티브 DOM 오버레이) |

---

## UI 렌더링 방식: 중요

**게임 UI의 대부분은 Phaser Canvas에 렌더링됩니다. DOM 요소가 아닙니다.**

- 메뉴 버튼(`Single Player`, `1 : 1`, `Battle Royale`) → Canvas 내부
- 게임 필드, 점수판, NEXT/HOLD → Canvas 내부
- 인게임 메뉴(InGameMenu) → **네이티브 DOM** (`position: fixed`, `z-index: 10000`)

### E2E 테스트에서 UI 상호작용

DOM 선택자(`.menu-container`, `#singleBtn`)로는 게임 메뉴에 접근할 수 없습니다.
Canvas 좌표 클릭을 사용하세요:

```typescript
const canvas = page.locator('#game canvas').first();
const box = await canvas.boundingBox();
// Single Player 버튼: canvas 중앙, 높이 42% 지점
await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);
// 1 : 1 버튼: 52%
await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.52);
// Battle Royale 버튼: 62%
await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
```

`test/harness/gameHarness.ts`에GameHarness 클래스가 이 좌표를 캡슐화합니다.

---

## 테스트 환경 (Harness)

### 테스트 종류

| 타입 | 프레임워크 | 위치 | 실행 명령 |
|------|-----------|------|----------|
| 유닛 | Jest | `test/unit/` | `npm test` |
| E2E | Playwright | `test/e2e/` | `npm run test:e2e` |
| 성능 | Playwright | `test/performance/` | `npm run test:perf` |
| 봇 시뮬레이션 | Jest | `test/unit/logic/botManager.simulation.test.ts` | `npm run test:bot-simulation` |

### 포트 분리

| 서버 | 포트 | 용도 |
|------|------|------|
| `npm run dev` | 8080 | 개발 서버 |
| `npm run server:dev` | 3031 | 게임 서버 (Socket.IO) |
| E2E 테스트 | **9090** | 독립 웹팩 서버 (항상 새로 기동) |

**E2E 테스트는 `reuseExistingServer: false`로 설정되어 있어 npm run dev 실행 여부와
무관하게 항상 독립적인 서버에서 동작합니다.**

### 테스트 하네스 유틸리티

```
test/
├── harness/
│   ├── gameHarness.ts       # 게임 UI 상호작용 (Canvas 클릭, 키보드)
│   ├── socketHarness.ts     # 소켓 직접 연결 테스트
│   └── fixtures.ts          # Playwright 커스텀 fixtures
├── mocks/
│   └── phaserMock.ts        # Phaser 모ck (Jest용)
├── fixtures/                # 테스트 데이터
├── unit/                    # 유닛 테스트 (40개 파일, 211개 테스트)
├── e2e/
│   ├── smoke.spec.ts        # 기본 스모크 테스트
│   ├── flows/               # 사용자 플로우 시나리오
│   │   ├── menu-navigation.spec.ts
│   │   ├── single-player.spec.ts
│   │   ├── mobile-layout.spec.ts
│   │   └── network-resilience.spec.ts
│   └── visual/
│       └── screenshot.spec.ts  # Visual Regression (baseline 존재)
└── performance/
    └── load.spec.ts           # 로딩/시작 성능
```

### 새 E2E 테스트 작성 시

1. `test/e2e/flows/`에 `*.spec.ts` 파일 생성
2. `GameHarness` 사용 권장:
   ```typescript
   import { test, expect } from '../../harness/fixtures';

   test('new feature', async ({ game }) => {
       await game.gotoMenu();
       await game.clickSinglePlayer();
       await game.moveLeft();
       await game.hardDrop();
   });
   ```
3. Canvas 렌더링 대기: `await expect(page.locator('#game canvas').first()).toBeVisible({ timeout: 15000 })`
4. 메뉴 대기: `await page.waitForTimeout(2000)` (폰트 로딩 시간)

---

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` — PR/푸시 시 자동 실행:

```
lint → unit-test (+coverage) → build → e2e-test → perf-test
```

- E2E 테스트 실패 시 스크린샷/비디오 아티팩트 저장
- Playwright 리포트 HTML 아티팩트 저장
- Jest coverage 리포트 아티팩트 저장

---

## Pre-commit Hook

Husky + lint-staged가 `pre-commit`에서 실행됩니다:

- ESLint `--fix`
- Prettier `--write`
- 변경된 파일 관련 유닛 테스트 실행

---

## 핵심 상수

| 상수 | 값 | 위치 |
|------|-----|------|
| 블록 크기 | `getBlockSize()` → 32px | `src/tetris/const/const.ts` |
| 데스크탑 필드 | 22x22 블록 (PlayScene) | `src/tetris/ui/gameLayout.ts` |
| N-Multi 필드 | 36x22 블록 | `src/tetris/ui/gameLayout.ts` |
| 모바일 필드 | 12x27 블록 | `src/tetris/ui/gameLayout.ts` |
| 서버 포트 | 3031 | `server/index.ts` |
| 개발 서버 포트 | 8080 | `webpack.config.js` |
| E2E 테스트 포트 | 9090 | `playwright.config.ts` |

---

## 코드 수정 시 테스트 전략

| 수정 범위 | 실행할 테스트 |
|-----------|--------------|
| 게임 로직 (playField, tetromino, score) | `npm test` |
| UI/레이아웃 (scenes, gameLayout) | `npm test` + `npm run test:e2e` |
| 네트워킹 (소켓 이벤트, 페이로드) | `npm test` + 서버 수동 테스트 |
| CSS/스타일 | `npm run test:e2e` (visual regression) |
| 성능 관련 | `npm run test:perf` |
| 릴리즈 전 | `npm run test:all` + `npm run build` |

---

## 인게임 메뉴 (DOM)

`InGameMenu` 클래스는 유일하게 **네이티브 DOM**으로 렌더링되는 UI입니다.
E2E 테스트에서 접근 가능:

```typescript
// 일시정지 메뉴
await page.keyboard.press('Escape');
await expect(page.locator('.menu-panel--pause')).toBeVisible();

// 메뉴 버튼 클릭
await page.locator('.menu-panel button').first().click();
```
