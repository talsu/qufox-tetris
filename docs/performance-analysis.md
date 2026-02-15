# 성능 최적화 분석 (qufox-tetris)

## 분석 범위
- 클라이언트 렌더링 경로 (Phaser Scene/오브젝트)
- 멀티플레이 네트워크 직렬화/역직렬화 경로
- 서버 N-Multi 스냅샷 브로드캐스트 경로

## 우선순위 높은 최적화 후보

### 1) N-Multi 미니 보드 렌더링의 과도한 재생성
**현상**
- `MiniPlayField.updateState()`가 호출될 때마다 `redraw()`를 실행합니다.
- `redraw()` 내부에서 매번 `BoardCodec.decode()`를 호출하고, 기존 블록 이미지를 `removeAll(true)`로 전부 파괴한 뒤 새 이미지들을 다시 생성합니다.

**근거 코드**
- `updateState()` → `redraw()` 호출: `src/tetris/objects/miniPlayField.ts`
- `redraw()`에서 `removeAll(true)` + `BoardCodec.decode()` + 이미지 재생성: `src/tetris/objects/miniPlayField.ts`

**영향**
- 상대 수가 늘수록(최대 100명) GC/드로우콜/오브젝트 생성 비용이 급증할 수 있습니다.
- 500ms 스냅샷 주기와 결합되면 프레임 드랍의 주요 원인이 됩니다.

**개선 제안**
- 오브젝트 풀링: 미니 필드당 최대 200칸 스프라이트를 재사용(visible/frame/x/y만 갱신).
- 변경분 렌더링(diff): 이전 보드 문자열과 비교해 바뀐 셀만 갱신.
- `updateState`에서 점수/생존 상태만 변하고 보드 문자열이 동일한 경우 `redraw()` 스킵.

---

### 2) 1v1/N-Multi 상태 직렬화 시 객체 할당 과다
**현상**
- `PlayField.serialize()`가 호출될 때마다 `{ col, row, type }` 객체 배열을 새로 생성합니다.
- 1v1은 약 10Hz, N-Multi는 5Hz로 주기적으로 직렬화가 발생합니다.

**근거 코드**
- 직렬화 구현: `src/tetris/objects/playField.ts`
- 1v1 전송 루프(100ms): `src/tetris/scenes/playScene.ts`
- N-Multi 전송 루프(200ms): `src/tetris/scenes/nMultiPlayScene.ts`

**영향**
- 고빈도 직렬화에서 단기 객체가 대량 생성되어 GC pressure가 커집니다.

**개선 제안**
- 내부 보드를 200칸 고정 배열/TypedArray로 유지하고, 네트워크 전송용 문자열을 증분 갱신.
- `serialize()` 결과 캐싱: 보드 변경 시에만 invalidate.
- N-Multi는 이미 `BoardCodec.encode()`를 쓰므로, `PlayField` 단계에서 바로 인코딩 문자열을 제공하는 API 추가 검토.

---

### 3) `getInactiveBlocks()`/라인 클리어 계산의 반복 순회
**현상**
- `getInactiveBlocks()`가 `map + reduce + concat`으로 매번 새 배열을 만듭니다.
- `getClearedRows()`는 후보 행마다 `filter`로 전체 블록을 재탐색합니다.

**근거 코드**
- `getInactiveBlocks()`: `src/tetris/objects/playField.ts`
- `getClearedRows()`: `src/tetris/objects/playField.ts`

**영향**
- 블록 수가 많은 구간에서 연산량(O(n*r))과 메모리 할당량이 증가합니다.

**개선 제안**
- 필드 occupancy(예: `rowCounts[20]`, `grid[20][10]`)를 상시 유지해 즉시 조회.
- `getInactiveBlocks()` 결과 재사용 또는 iterator 기반 순회로 중간 배열 제거.
- 클리어 판정은 잠긴 테트로미노가 닿은 행에 대해 `rowCounts[row] === 10`으로 O(k) 처리.

---

### 4) 서버 N-Multi 스냅샷 브로드캐스트의 전체 스캔 구조
**현상**
- 방마다 `setInterval(500ms)`를 두고 모든 플레이어를 순회해 버전(`v`) 비교 후 델타를 구성합니다.
- 방 생성 경로가 두 곳이며 각각 interval 생성 로직이 중복됩니다.

**근거 코드**
- interval 생성: `server/index.js`
- 델타 브로드캐스트 루프: `server/index.js`의 `broadcastNMultiSnapshot`

**영향**
- 방/플레이어 수가 커질수록 이벤트 루프 부담과 직렬화 비용이 선형 증가.

**개선 제안**
- 이벤트 기반 dirty-set: `nmulti_update_state`에서 변경된 socket id를 room dirty set에 기록 후, tick에서는 dirty만 직렬화.
- interval 생성 코드 공통화로 유지보수 비용/실수 가능성 감소.
- 대규모 방에서는 고정 주기 + 최대 패킷 크기 제한(백프레셔) 전략 도입.

---

### 5) 런타임 로그 과다 가능성
**현상**
- 락/콤보 이벤트마다 `console.log`가 발생합니다.

**근거 코드**
- `Engine.onLock()`: `src/tetris/engine.ts`

**영향**
- 브라우저 콘솔 I/O가 많은 환경에서 메인스레드 지연 유발 가능.

**개선 제안**
- `NODE_ENV !== 'production'` 또는 디버그 플래그 기반 로깅 가드.

## 실행 순서 제안 (ROI 기준)
1. `MiniPlayField` diff 렌더링 + 오브젝트 풀링
2. `PlayField` 직렬화 캐싱/증분화
3. `PlayField` 내부 occupancy 캐시 도입
4. 서버 dirty-set 브로드캐스트
5. 디버그 로깅 가드

## 간단 측정 지표 (적용 전/후 비교)
- 클라이언트: FPS, frame time p95, GC pause, JS heap size, 네트워크 송수신 바이트/초
- 서버: room당 tick 처리시간 p95, emit payload 크기, 이벤트 루프 지연
