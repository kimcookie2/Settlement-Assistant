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
api/
└── ocr.ts                  # Vercel 서버리스 함수 — CLOVA OCR 프록시 + 술 항목 분류
src/
├── types/index.ts          # 핵심 타입 (Participant, Item, Round, SettlementMatrix)
├── store/store.ts          # Zustand 스토어 — 전역 상태 + 모든 액션
├── utils/
│   ├── calculate.ts        # 정산 계산 순수 함수
│   ├── format.ts           # formatKRW
│   ├── imageProcess.ts     # 영수증 이미지 리사이즈 + base64 인코딩
│   └── ocr.ts              # /api/ocr 클라이언트 래퍼
├── components/
│   ├── ui/Button.tsx       # 공통 버튼 (variant: primary|secondary|danger|ghost)
│   ├── ui/Input.tsx        # 공통 인풋
│   ├── ParticipantSection.tsx  # 참석 인원 추가/수정/삭제
│   ├── RoundSection.tsx        # 차수 목록 + 추가 버튼
│   ├── RoundCard.tsx           # 차수 카드 (참석자 선택 + 항목 관리 + 영수증)
│   ├── ItemRow.tsx             # 항목 행 (금액 + 부담자 선택)
│   ├── ReceiptButton.tsx       # 영수증 사진 → OCR → 자동 채움
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

## 영수증 OCR (Gemini 2.5 Flash, 멀티모달 LLM)

차수 헤더의 "📷 영수증" 버튼 → 카메라/앨범에서 사진 → 클라이언트 리사이즈(최대 1600px, JPEG 0.85) → `/api/ocr`로 base64 전송 → Vercel 함수가 Gemini API에 이미지 + 프롬프트 전달 → `responseSchema`로 `{ totalAmount, alcoholAmount }` JSON 강제 → `applyReceipt`로 totalAmount 자동 채움 + 술 합계가 0보다 크면 "술" 항목 자동 추가 (`payerIds: []`로 시작, 사용자가 칩으로 부담자 선택).

**환경 변수 (Vercel Project Settings)**
- `GEMINI_API_KEY` — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)에서 무료 발급

**술 분류 로직**: 키워드 매칭 없음. Gemini가 프롬프트만 보고 의미적으로 판단 ("참이슬"이 신제품이어도 LLM이 알아서 술로 분류). 프롬프트는 [api/ocr.ts](api/ocr.ts)의 `PROMPT` 상수에서 조정.

**무료 티어 한도**: 분당 15회 / 일 1500회 (Gemini Flash 기준). 무료 티어는 입력이 모델 학습에 사용될 수 있음 — 민감한 영수증이면 유료 티어로 전환.

**로컬 개발**: `pnpm dev`는 정적 서버라 `/api/*`가 동작 안 함. 로컬 OCR 테스트 필요 시 `vercel dev` (Vercel CLI) 사용. 그렇지 않으면 푸시 후 Vercel Preview에서 확인.

## v2 고려사항

- 정산 결과 카드 스타일 토글 (표 ↔ 카드)
- 정산 링크 공유 (URL 인코딩)
- 카카오페이/토스 딥링크 연동
