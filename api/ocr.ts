import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_MODEL = 'gemini-2.5-flash'

const PROMPT = `이 한국 영수증 사진을 분석해서 JSON으로 반환해주세요.

다음 단계로 분석합니다:
1. 영수증의 모든 주문 항목을 나열합니다.
2. 각 항목의 이름(name)과 합계 금액(amount, 정수·원 단위)을 추출합니다. 수량이 표시되어 있으면 단가가 아닌 "단가 × 수량" 합계를 amount로 사용합니다.
3. 각 항목이 알코올 음료인지 판정해서 isAlcohol(boolean)을 설정합니다.

알코올 판정 기준 (isAlcohol: true):
- 카테고리: 소주, 맥주, 막걸리, 청주, 사케, 와인, 위스키, 양주, 칵테일, 하이볼, 샴페인, 동동주, 매실주, 복분자주, 전통주
- 한국 소주 브랜드: 참이슬, 처음처럼, 진로, 좋은데이, 잎새주, 화요, 안동소주, C1, 시원, 무학, 대선, 한라산
- 한국 맥주 브랜드: 카스, 테라, 클라우드, 하이트, 켈리, 맥스, 필라이트, 한맥, OB, 골든에일
- 수입 맥주: 호가든, 코로나, 칭타오, 아사히, 산미구엘, 기네스, 하이네켄, 버드와이저, 블루문, 스텔라, 에델바이스, 삿포로, 기린, 타이거
- 위스키/양주: 잭다니엘, 글렌피딕, 발렌타인, 로얄살루트, 시바스리갈, 맥캘란, 조니워커, 윈저, 임페리얼
- 약어/속어: "참이슬", "처음" (처음처럼), "이슬", "쏘맥", "소주1병", "맥주 500cc" 등 한국에서 흔히 술로 통하는 표기
- 메뉴명에 "주(酒)", "와인", "사케", "보드카", "데킬라", "럼" 등이 들어가면 술
- 위 목록은 대표 예시이며, 목록에 없는 항목이라도 알코올 음료임이 명백하다면 (항목명의 의미, 가격대, 영수증 맥락 등 종합 판단) isAlcohol: true로 처리하세요. 반대로 판단이 모호하거나 비알코올 가능성이 더 높으면 false로 처리하세요.

비알코올 (isAlcohol: false):
- 콜라, 사이다, 환타, 스프라이트, 펩시, 제로콜라, 맥콜
- 주스, 오렌지주스, 자몽주스, 토마토주스
- 커피, 아메리카노, 라떼, 카푸치노
- 차, 녹차, 홍차, 보리차, 식혜
- 물, 생수, 탄산수
- 음료수, 음료, 우유, 에이드, 스무디, 셰이크
- 모든 음식 메뉴 (고기, 찌개, 면, 밥, 안주 등)

추가로 영수증의 최종 결제 금액(부가세 포함된 합계/결제금액/카드승인금액)을 totalAmount로 추출합니다. 할인이 적용된 경우 할인 후 최종 금액을 사용합니다.

recognizable 판정:
- 영수증의 최종 결제 금액(totalAmount)을 영수증에서 명확하게 읽어낼 수 없을 정도로 사진이 훼손된 경우 (인쇄 손상, 심한 번짐, 잘림, 흐림, 너무 어두움/밝음 등으로 핵심 금액이 식별 불가) 에만 recognizable을 false로 설정하세요. 이 경우 totalAmount는 0, items는 빈 배열로 반환합니다.
- totalAmount를 어느 정도 자신 있게 읽을 수 있다면 (일부 항목명이 흐릿하거나 약간의 추측이 필요한 정도는 허용) recognizable은 true입니다.

각 항목의 isAlcohol 판단이 어려우면 false로 처리합니다.`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    recognizable: { type: 'boolean' },
    totalAmount: { type: 'integer' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'integer' },
          isAlcohol: { type: 'boolean' },
        },
        required: ['name', 'amount', 'isAlcohol'],
      },
    },
  },
  required: ['recognizable', 'totalAmount', 'items'],
}

interface GeminiItem {
  name?: unknown
  amount?: unknown
  isAlcohol?: unknown
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다' })
    return
  }

  const body = req.body as { imageBase64?: string; format?: string } | undefined
  const imageBase64 = body?.imageBase64
  if (!imageBase64) {
    res.status(400).json({ error: '이미지가 누락되었습니다' })
    return
  }

  const format = (body?.format ?? 'jpg').toLowerCase()
  const mimeType =
    format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const payload = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  }

  const MAX_ATTEMPTS = 3
  const RETRY_DELAY_MS = 500
  let data: GeminiResponse | null = null
  let lastFailureDetail: string | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    }

    try {
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (geminiRes.ok) {
        data = (await geminiRes.json()) as GeminiResponse
        break
      }

      lastFailureDetail = await geminiRes.text()

      if (geminiRes.status >= 400 && geminiRes.status < 500) {
        res.status(502).json({ error: 'Gemini API 호출 실패', detail: lastFailureDetail })
        return
      }
    } catch (err) {
      lastFailureDetail = err instanceof Error ? err.message : String(err)
    }
  }

  if (!data) {
    res.status(502).json({
      error: `Gemini API 호출 실패 (${MAX_ATTEMPTS}회 시도)`,
      detail: lastFailureDetail,
    })
    return
  }

  try {
    if (data.promptFeedback?.blockReason) {
      res.status(422).json({
        error: `요청이 차단되었습니다: ${data.promptFeedback.blockReason}`,
      })
      return
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      res.status(422).json({ error: '영수증을 인식하지 못했습니다 (사진 품질을 확인하세요)' })
      return
    }

    let parsed: { recognizable?: unknown; totalAmount?: unknown; items?: unknown }
    try {
      parsed = JSON.parse(text)
    } catch {
      res.status(502).json({ error: 'Gemini 응답 파싱 실패', detail: text })
      return
    }

    const recognizable = parsed.recognizable === true

    if (!recognizable) {
      res.status(200).json({
        recognizable: false,
        totalAmount: 0,
        alcoholAmount: 0,
        alcoholNames: [],
      })
      return
    }

    const totalAmount = Math.max(0, Math.floor(Number(parsed.totalAmount) || 0))

    const itemsRaw = Array.isArray(parsed.items) ? (parsed.items as GeminiItem[]) : []
    const alcoholItems = itemsRaw
      .map((it) => ({
        name: typeof it.name === 'string' ? it.name : '',
        amount: Math.max(0, Math.floor(Number(it.amount) || 0)),
        isAlcohol: it.isAlcohol === true,
      }))
      .filter((it) => it.isAlcohol && it.amount > 0)

    const alcoholAmount = alcoholItems.reduce((sum, it) => sum + it.amount, 0)
    const alcoholNames = alcoholItems.map((it) => it.name).filter(Boolean)

    res.status(200).json({ recognizable: true, totalAmount, alcoholAmount, alcoholNames })
  } catch (err) {
    res.status(500).json({
      error: 'OCR 처리 실패',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}
