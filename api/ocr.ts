import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_MODEL = 'gemini-2.5-flash'

const PROMPT = `이 한국 영수증 사진을 분석해서 JSON으로 반환해주세요.

추출할 정보:
- totalAmount: 영수증의 최종 결제 금액 (정수, 원 단위, 쉼표 없이). 부가세 포함된 합계/결제금액으로 판단하세요.
- alcoholAmount: 술 항목들의 합계 금액 (정수, 원 단위). 소주·맥주·막걸리·청주·사케·와인·위스키·양주·칵테일·하이볼·샴페인 등 모든 알코올 음료를 포함합니다. 콜라·사이다·주스·커피 등 비알코올 음료는 제외하세요. 술 항목이 없거나 판별 불가하면 0.

금액 인식이 불가능하면 해당 필드는 0으로 반환하세요.`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    totalAmount: { type: 'integer' },
    alcoholAmount: { type: 'integer' },
  },
  required: ['totalAmount', 'alcoholAmount'],
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

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!geminiRes.ok) {
      const detail = await geminiRes.text()
      res.status(502).json({ error: 'Gemini API 호출 실패', detail })
      return
    }

    const data = (await geminiRes.json()) as GeminiResponse

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

    let parsed: { totalAmount?: unknown; alcoholAmount?: unknown }
    try {
      parsed = JSON.parse(text)
    } catch {
      res.status(502).json({ error: 'Gemini 응답 파싱 실패', detail: text })
      return
    }

    const totalAmount = Math.max(0, Math.floor(Number(parsed.totalAmount) || 0))
    const alcoholAmount = Math.max(0, Math.floor(Number(parsed.alcoholAmount) || 0))

    res.status(200).json({ totalAmount, alcoholAmount })
  } catch (err) {
    res.status(500).json({
      error: 'OCR 처리 실패',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}
