import { processReceiptImage } from './imageProcess'

export interface OcrResult {
  totalAmount: number
  alcoholAmount: number
}

export async function recognizeReceipt(file: File): Promise<OcrResult> {
  const { base64, format } = await processReceiptImage(file)

  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, format }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}) as { error?: string })
    throw new Error((data as { error?: string }).error ?? `OCR 요청 실패 (${res.status})`)
  }

  return (await res.json()) as OcrResult
}
