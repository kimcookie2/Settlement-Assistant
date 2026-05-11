# 정산도우미 (Settlement Helper)

회식/모임에서 차수별로 금액과 참석자가 달라질 때 인원별 정산 금액을 자동 계산해주는 웹 앱.

## 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | Vite + React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite` 플러그인) |
| 상태관리 | Zustand v5 + `persist` 미들웨어 (sessionStorage) |
| 이미지 저장 | html-to-image (PNG) |
| ID 생성 | nanoid |
| 패키지 매니저 | pnpm |
| 배포 | Vercel (추후) |

## 주요 커맨드

```bash
pnpm dev        # 개발 서버 (http://localhost:5173)
pnpm build      # 프로덕션 빌드
pnpm preview    # 빌드 결과 미리보기
pnpm tsc --noEmit  # 타입 검사만
```

## 디렉토리 구조

```
src/
├── types/index.ts          # 핵심 타입 (Participant, Item, Round, SettlementMatrix)
├── store/store.ts          # Zustand 스토어 — 전역 상태 + 모든 액션
├── utils/calculate.ts      # 정산 계산 순수 함수
├── components/
│   ├── ui/Button.tsx       # 공통 버튼 (variant: primary|secondary|danger|ghost)
│   ├── ui/Input.tsx        # 공통 인풋
│   ├── ParticipantSection.tsx  # 참석 인원 추가/수정/삭제
│   ├── RoundSection.tsx        # 차수 목록 + 추가 버튼
│   ├── RoundCard.tsx           # 차수 카드 (참석자 선택 + 항목 관리)
│   ├── ItemRow.tsx             # 항목 행 (금액 + 부담자 선택)
│   └── SettlementTable.tsx     # 정산 결과 표 + 이미지 저장
├── App.tsx                 # 헤더 + 레이아웃
├── main.tsx
└── index.css               # @import "tailwindcss" 한 줄
```

## 데이터 모델

```ts
interface Participant { id: string; name: string }

interface Item {
  id: string
  name: string        // 항목 이름 (예: "술")
  amount: number      // 항목 금액 (전체에서 차감되는 부분)
  payerIds: string[]  // 이 항목을 부담할 사람들
}

interface Round {
  id: string
  name: string           // 예: "1차 - 삼겹살집"
  attendeeIds: string[]  // 이 차수 참석자
  totalAmount: number    // 차수 전체 결제 금액
  items: Item[]          // 특정 인원만 부담하는 세부 항목 (옵션)
}
```

상태는 `sessionStorage`에 자동 저장 → 새로고침 유지, 탭 닫으면 소멸. persist `version: 2`.

## 정산 계산 규칙

각 차수는 "전체 금액 → 항목 차감 → 공통 균등 분할 + 항목별 분할" 방식으로 계산한다.

1. **공통 금액** = `totalAmount - sum(items.amount)` (음수면 0으로 클램프)
2. 공통 금액은 차수 참석자 **전원**에게 `Math.floor(공통 / attendees)` 균등 분할
3. 각 항목은 해당 항목의 `payerIds`에게 `Math.floor(item.amount / payerIds)` 분할
4. 같은 사람이 두 분할 모두에 들어가면 누적 (예: 술 부담자도 공통 부담을 함께 짐)
5. 1원 미만 버림(floor)이 의도된 동작
6. 차수에 참석하지 않은 인원은 `participated: false` → 표에 `—` 표시

**예시**: 전체 100,000 / 참석 4명 / 술 항목 20,000 (A,B 부담)
→ 공통 80,000 ÷ 4 = 20,000원/인 (A,B,C,D)
→ 술 20,000 ÷ 2 = 10,000원/인 (A,B)
→ 결과: A·B = 30,000원, C·D = 20,000원

```
src/utils/calculate.ts
  calculateSettlement(participants, rounds) → SettlementMatrix
  totalByParticipant(matrix, participantId) → number
  totalByRound(matrix, roundId, participantIds) → number
  grandTotal(matrix) → number
```

## UI 패턴

- **단순 케이스**: 전체 금액만 입력 → 자동으로 참석자 균등 분할
- **복합 케이스**: "+ 항목 추가"로 특정 인원만 부담하는 항목을 추가 → 그 금액은 전체에서 차감되고 부담자끼리 분할
- RoundCard는 "전체 금액" 입력 아래에 공통 분할 미리보기를 표시 (예: `공통 80,000원 · 4명 균등 (인당 20,000원)`)
- 항목 합계가 전체 금액 초과 시 빨간 경고 표시

## 코딩 컨벤션

- 컴포넌트명: PascalCase
- 유틸 함수: 순수 함수, 사이드이펙트 없음
- 스토어 액션: `useStore((s) => s.actionName)` 셀렉터로 구독
- 주석: 비자명한 WHY만, WHAT 설명 금지

## v2 고려사항

- 정산 결과 카드 스타일 토글 (표 ↔ 카드)
- 정산 링크 공유 (URL 인코딩)
- 카카오페이/토스 딥링크 연동
