# 2009 Tetris Design Guideline 갭 분석 및 수정 계획

## 범위
- 기준 문서: `2009 Tetris Design Guideline.md`
- 추가 참고: Appendix A `The Tetris Engine` 플로우차트(Generation → Falling → Lock → Pattern → Iterate → Animate → Eliminate → Completion)
- 점검 대상: 핵심 규칙 구현(`const`, `scoreSystem`, `playField`, `inputManager`, `engine`, `ui/gameLayout`)

## 요약
- **즉시 수정 필요(우선순위 상)**
  1. Extended Placement(락다운 리셋) 횟수 오프바이원
  2. 레벨업 계산식이 가이드의 "실제 라인 수 기반"과 다름
  3. DAS/ARR 값이 가이드 권장(~0.3s DAS, 전체 횡이동 약 0.5s) 대비 빠름
- **엔진 관점 보완 필요(우선순위 중)**
  4. Appendix A 단계를 코드에서 명시적 상태로 관리하지 않아 검증/디버깅 추적성이 약함
  5. Pattern/Iterate/Animate/Eliminate/Completion 단계 전이 테스트가 부족함
- **정책 결정 필요(우선순위 중)**
  6. 레벨 상한(1~15) 강제 여부

---

## 항목별 분석

### 1) Matrix / Buffer Zone
- **가이드 요구**: 보이는 20행 + 숨김 20행(총 40행).
- **현재 구현**: 유효 row 범위를 `[-20, 19]`로 허용.
- **판정**: ✅ 충족.

### 2) Spawn 위치/방향/즉시 1칸 낙하
- **가이드 요구**: 북쪽 방향 스폰, 중앙 정렬, 생성 직후 아래가 비어 있으면 즉시 1칸 낙하.
- **현재 구현**:
  - 스폰 기본 위치 `col=3`, `row=-2` (0-index 기준 가이드 중앙 정렬과 일치)
  - 생성 직후 `moveDown('autoDrop')` 실행
- **판정**: ✅ 충족.

### 3) 7-Bag 랜덤
- **가이드 요구**: 7-Bag 사용.
- **현재 구현**: `TetrominoBoxQueue` 기반 7개 유니크 사이클을 전제로 테스트 존재.
- **판정**: ✅ 충족.

### 4) Lock Down (Extended Placement)
- **가이드 요구**: 착지 후 0.5초, 이동/회전 시 리셋, **같은 높이에서 최대 15회 리셋 허용**.
- **현재 구현**:
  - `LOCK_DELAY_MS = 500`
  - `manipulationCount < 15`일 때만 타이머 재시작
- **갭**: 현재 조건이면 리셋이 14회까지만 허용되는 형태가 되어 **오프바이원 가능성**이 큼.
- **판정**: ⚠️ 부분 충족.

### 5) Gravity / Soft Drop / Hard Drop
- **가이드 요구**:
  - 중력: 레벨 공식 기반
  - Soft Drop: 현재 중력의 20배
  - Hard Drop: 즉시 락
- **현재 구현**:
  - 중력 지연: `Math.pow((0.8 - ((level - 1) * 0.007)), (level - 1)) * 1000`
  - Soft Drop: 씬에서 `autoDropDelay / 20`로 입력 반복 설정
  - Hard Drop: `hardDrop()` 후 즉시 `lock()`
- **판정**: ✅ 충족.

### 6) DAS
- **가이드 요구**: 좌우 홀드 시 약 0.3초 대기 후, 전체 가로 이동이 약 0.5초 수준.
- **현재 구현**: `DAS_MS = 183`, `AR_MS = 50`.
- **갭**: 가이드 권장 체감보다 빠른 세팅.
- **판정**: ⚠️ 부분 충족(튜닝 필요).

### 7) Scoring / B2B / T-Spin
- **가이드 요구**: 기본 점수표 및 B2B, 3-corner T-Spin 판정.
- **현재 구현**: 점수표/배수/B2B/T-Spin 코너 판정 모두 존재.
- **판정**: ✅ 충족.

### 8) Level Up
- **가이드 요구**: 레벨업은 실제 라인 클리어 누적으로 관리(레벨*5 목표), 1~15 레벨 체계.
- **현재 구현**:
  - 레벨 목표 증가 로직은 존재
  - 그러나 `LINE_COUNT`(Single=1, Double=3, Triple=5, Tetris=8 ...)를 누적하여 레벨 계산
- **갭**: 실제 클리어 라인 수(1/2/3/4)가 아닌 가중치 라인으로 레벨업이 진행되어 가이드와 불일치.
- **판정**: ❌ 미충족.

### 9) UI (Next/Hold/Stats)
- **가이드 요구**: Next 1~6, Hold, Score/Level/Lines 표기.
- **현재 구현**:
  - 데스크톱 Next=6, 모바일 portrait Next=1
  - Hold/Stats 패널 존재
- **판정**: ✅ 충족.

### 10) Appendix A 엔진 플로우(Generation/Falling/Lock/Pattern/Iterate/Animate/Eliminate/Completion)
- **가이드 요구**: 조작 가능한 테트리미노는 항상 1개이며, 각 피스가 엔진 8단계를 순차적으로 통과.
- **현재 구현 매핑**:
  - Generation/Falling/Lock: `spawnTetromino`, `autoDrop`, `startLockTimer`/`lock`로 동작
  - Pattern/Iterate/Animate/Eliminate: `getClearedRows` → `playClearAnimation` → `clearRows`
  - Completion: lock 이벤트 emit 후 ARE 지연 뒤 다음 스폰
- **평가**:
  - 동작 자체는 플로우와 **대체로 정합**
  - 다만 phase 상태를 enum/state-machine으로 명시하지 않아 단계 전이 검증이 어렵고, 회귀 시 문제 추적성이 낮음
- **판정**: ⚠️ 동작 정합 / 구조적 추적성 미흡.

---

## 수정 계획

## Phase 1 — 규칙 정합성 우선 (1~2일)
1. **Extended Placement 리셋 카운트 정확화**
   - 목표: 같은 높이에서 정확히 15회까지 리셋 허용, 16회째부터 불가.
   - 조치: `setLockTimer`의 조건식과 `manipulationCount` 증가 타이밍을 테스트로 고정.
   - 검증: 경계값(14/15/16) 단위 테스트 추가.

2. **레벨업 계산을 실제 클리어 라인 기반으로 전환**
   - 목표: Single/Double/Triple/Tetris가 각각 1/2/3/4 라인으로 누적.
   - 조치: `GameRules.getLineCount` 경로 제거 또는 레벨용 라인 계산 분리.
   - 검증: 레벨업 시나리오 테스트(예: 5라인/15라인/누적 초과 케이스) 추가.

## Phase 2 — 엔진 플로우 가시성/검증 강화 (0.5~1일)
3. **Appendix A phase 상태 명시화**
   - 목표: 최소한 디버그 모드에서 현재 phase를 명시적으로 추적 가능하게 구성.
   - 조치: `PlayField` 또는 `Engine`에 phase enum(`Generation`, `Falling`, `Lock`, `Pattern`, `Iterate`, `Animate`, `Eliminate`, `Completion`) 추가.
   - 검증: phase 전이 순서 단위 테스트(하드드롭/일반락/라인클리어 유무 분기) 작성.

4. **Pattern→Iterate→Animate→Eliminate→Completion 전이 회귀 테스트 보강**
   - 목표: 라인 클리어 있는 경우/없는 경우 모두 phase 순서가 안정적으로 유지.
   - 조치: `guideline.test.ts` 또는 신규 `engine_flow.test.ts`에서 이벤트/호출 순서 캡처.
   - 검증: CI에서 phase sequence snapshot 또는 ordered assertion 통과.

## Phase 3 — 조작감 가이드 정렬 (0.5~1일)
5. **DAS/ARR 튜닝값 가이드 프로파일 추가**
   - 목표: 기본값을 가이드 권장(약 DAS 300ms, 횡이동 체감 0.5s)에 맞춤.
   - 조치: `CONST.PLAY_FIELD`에 프로파일(legacy/current/guideline) 도입 혹은 설정값화.
   - 검증: 입력 반복 간격 단위 테스트 + 플레이 테스트 체크리스트 작성.

## Phase 4 — 정책 확정 (0.5일)
6. **레벨 상한(15) 적용 여부 결정**
   - 목표: 가이드 모드에서는 15 상한 강제.
   - 조치: 옵션 플래그(`guidelineStrict`)로 상한 on/off.
   - 검증: 15레벨 도달 후 속도/목표값 고정 여부 테스트.

---

## 권장 구현 순서
1) 레벨업 계산 정합성 수정
2) 락다운 15회 경계값 수정
3) 엔진 phase 명시화 + 전이 테스트 추가
4) DAS/ARR 가이드 프로파일 반영
5) 레벨 15 상한 정책 반영

## 완료 정의(DoD)
- 가이드 핵심 항목(스폰/회전/락다운/점수/레벨/입력/엔진 phase) 관련 테스트가 모두 녹색.
- `guideline.test.ts`(또는 `engine_flow.test.ts`)에 레벨업/락다운 경계/phase 전이 케이스 보강.
- 기본 모드와 가이드 엄격 모드(있다면)의 동작 차이가 문서화됨.
