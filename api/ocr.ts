import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'

const ALCOHOL_KEYWORDS = [
  '소주', '맥주', '막걸리', '청주', '사케', '와인', '위스키', '양주', '칵테일', '하이볼',
  '참이슬', '처음처럼', '진로', '좋은데이', '잎새주', '화요', '안동소주',
  '카스', '테라', '클라우드', '하이트', '켈리', '맥스', '필라이트', '한맥',
  '호가든', '코로나', '칭타오', '아사히', '산미구엘', '기네스', '하이네켄',
  '버드와이저', '블루문', '스텔라', '에델바이스', '삿포로', '기린',
  '잭다니엘', '글렌피딕', '발렌타인', '로얄살루트', '시바스리갈', '맥캘란', '조니워커',
  '샴페인', '동동주', '매실주', '복분자', '모히토', '진토닉', '잭콕',
]

function isAlcohol(itemName: string): boolean {
  const normalized = itemName.replace(/\s+/g, '')
  return ALCOHOL_KEYWORDS.some((kw) => normalized.includes(kw))
}

function readPriceText(node: unknown): string {
  if (!node || typeof node !== 'object') return '0'
  const n = node as { formatted?: { value?: string }; text?: string }
  return n.formatted?.value ?? n.text ?? '0'
}

function parsePrice(value: string): number {
  const num = parseInt(value.replace(/[^\d]/g, ''), 10)
  return Number.isNaN(num) ? 0 : num
}

interface OcrItem {
  name?: { text?: string }
  price?: { price?: { text?: string; formatted?: { value?: string } } }
}

interface OcrSubResult {
  items?: OcrItem[]
}

interface OcrReceiptResult {
  totalPrice?: { price?: { text?: string; formatted?: { value?: string } } }
  subResults?: OcrSubResult[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const invokeUrl = process.env.CLOVA_OCR_INVOKE_URL
  const secretKey = process.env.CLOVA_OCR_SECRET_KEY

  if (!invokeUrl || !secretKey) {
    res.status(500).json({ error: 'OCR가 설정되지 않았습니다 (환경 변수 누락)' })
    return
  }

  const body = req.body as { imageBase64?: string; format?: string } | undefined
  const imageBase64 = body?.imageBase64
  const format = (body?.format ?? 'jpg').toLowerCase()

  if (!imageBase64) {
    res.status(400).json({ error: '이미지가 누락되었습니다' })
    return
  }

  const ocrPayload = {
    version: 'V2',
    requestId: randomUUID(),
    timestamp: Date.now(),
    images: [
      {
        format,
        name: 'receipt',
        data: imageBase64,
      },
    ],
  }

  try {
    const ocrRes = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OCR-SECRET': secretKey,
      },
      body: JSON.stringify(ocrPayload),
    })

    if (!ocrRes.ok) {
      const detail = await ocrRes.text()
      res.status(502).json({ error: 'CLOVA OCR 호출 실패', detail })
      return
    }

    const data = (await ocrRes.json()) as {
      images?: Array<{ receipt?: { result?: OcrReceiptResult } }>
    }
    const result = data.images?.[0]?.receipt?.result
    if (!result) {
      res.status(422).json({ error: '영수증을 인식하지 못했습니다 (사진 품질을 확인하세요)' })
      return
    }

    const totalAmount = parsePrice(readPriceText(result.totalPrice?.price))

    let alcoholAmount = 0
    for (const sub of result.subResults ?? []) {
      for (const item of sub.items ?? []) {
        const name = item.name?.text ?? ''
        if (isAlcohol(name)) {
          alcoholAmount += parsePrice(readPriceText(item.price?.price))
        }
      }
    }

    res.status(200).json({ totalAmount, alcoholAmount })
  } catch (err) {
    res.status(500).json({
      error: 'OCR 처리 실패',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}
