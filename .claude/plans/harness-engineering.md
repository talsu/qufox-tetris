# Harness Engineering 도입 계획

## Phase 1: Maintainability Harness (즉시)

### 1.1 Pre-commit Hook (Fast Feedback)
- Husky + lint-staged 설치
- ESLint/Prettier 체크
- `npm test -- --findRelatedTests` — 변경된 파일만 유닛 테스트
- **목표**: 커mit 전 기본 품질 게이트

### 1.2 테스트 인프라 정비
- Jest 유닛 테스트 커버리지 확대 (현재 35+ 파일)
- Playwright E2E 테스트 확장 (현재 smoke 1개)
- 테스트 픽스처/팩토리 패턴 도입 (`test/fixtures/`)
- Mock 서버 인프라 (`test/mocks/socketServer.ts`)

### 1.3 CI/CD 파이프라인 (GitHub Actions)
- `.github/workflows/ci.yml`
  - PR 트리거: lint → unit test → build → e2e test
  - 서버 + 클라이언트 동시 실행 통합 테스트
  - Playwright 리포트 아티팩트 저장
  - 테스트 실패 시 스크린샷/비디오 아티팩트

---

## Phase 2: Behavior Harness (게임 로직 검증)

### 2.1 E2E 테스트 시나리오 확장
| 시나리오 | 타입 |
|---------|------|
| 메뉴 → 로비 → 1v1 매칭 → 플레이 → 게임오버 | E2E |
| N-multi 로비 → 게임 시작 → 점수 경쟁 | E2E |
| Socket.IO 연결/재연결 | 통합 |
| 모바일 레이아웃 (Playwright device emulation) | E2E |
| 네트워크 지연/단절 복구 | Chaos |

### 2.2 게임 로직 하네스
- `test/harness/gameHarness.ts`: 게임 상태 검증 유틸리티
- `test/harness/socketHarness.ts`: 소켓 이벤트 검증 유틸리티
- Playwright `test.extend()`로 커스텀 fixtures 정의
- Visual Regression Testing (Playwright screenshots)

### 2.3 Bot 시뮬레이션 CI 연동
- 기존 `botManager.simulation.test.ts` CI에서 실행
- 봇 대전 자동화 → 점수/성능 메트릭 수집

---

## Phase 3: Architecture Fitness Harness (품질 게이트)

### 3.1 성능 벤치마킹
- `test/performance/`: 게임 FPS, 메모리 사용량, 초기 로딩 시간
- Playwright `performance.timing` + Custom metrics
- regression threshold 설정 (예: FPS 55 미만 = fail)

### 3.2 Chaos Engineering
- 네트워크 지연/패킷 손실 시뮬레이션
- 서버 강제 재시작 후 클라이언트 복구 검증
- Playwright `page.route()`로 네트워크 조건 제어

### 3.3 Coverage Gate
- Jest coverage threshold 설정 (lines: 70%, branches: 60%)
- CI에서 coverage 미만 시 PR 차단

### 3.4 Bundle Size Gate
- webpack-bundle-analyzer CI 연동
- bundle size 증가 임계값 초과 시 경고

---

## Phase 4: Self-Healing & AI Harness (선택적)

### 4.1 Intent-Driven Assertions
- Playwright `expect()` 커스텀 matcher
- DOM 구조 변경에 강한 선택자 전략 (data-testid, role 기반)

### 4.2 테스트 자동 생성
- AI coding agent가 새 기능 구현 시 대응 테스트 스켈레톤 생성
- PR 코멘트에 테스트 커버리지 리포트 자동 추가

---

## 파일 구조

```
test/
├── unit/                    # 기존 유닛 테스트
├── e2e/                     # Playwright E2E
│   ├── flows/               # 사용자 플로우 시나리오
│   ├── visual/              # Visual regression
│   └── smoke.spec.ts
├── integration/             # 서버-클라이언트 통합
├── performance/             # 성능 벤치마크
├── harness/                 # 테스트 하네스 유틸리티
│   ├── gameHarness.ts
│   ├── socketHarness.ts
│   └── fixtures.ts
├── mocks/                   # Mock 서버, Phaser mock
│   └── socketServer.ts
├── fixtures/                # 테스트 데이터/팩토리
└── setup.ts
.github/
└── workflows/
    └── ci.yml               # CI 파이프라인
```

## npm 스크립트 추가

```json
{
  "test:ci": "jest --coverage --ci",
  "test:e2e:ci": "playwright test --reporter=html,list",
  "test:perf": "jest --config jest.config.js test/performance/",
  "test:all": "npm run test:ci && npm run test:e2e:ci",
  "test:coverage:report": "jest --coverage && open coverage/lcov-report/index.html"
}
```

## 구현 우선순위

1. Husky + lint-staged + CI 파이프라인 (Phase 1)
2. E2E 시나리오 확장 + 하네스 유틸리티 (Phase 2)
3. 성능/Chaos/Coverage Gate (Phase 3)
4. AI/자동화 (Phase 4, 선택적)
