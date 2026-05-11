import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useStore } from '../store/store'
import { recognizeReceipt } from '../utils/ocr'
import Button from './ui/Button'

interface ReceiptButtonProps {
  roundId: string
}

export default function ReceiptButton({ roundId }: ReceiptButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const applyReceipt = useStore((s) => s.applyReceipt)

  function openPicker() {
    inputRef.current?.click()
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setLoading(true)
    try {
      const result = await recognizeReceipt(file)

      if (!result.recognizable) {
        alert('금액이 확실하지 않을 정도로 훼손된 영수증 사진이면 판별이 불가능합니다.')
        return
      }

      applyReceipt(roundId, result.totalAmount, result.alcoholAmount)
    } catch {
      alert('영수증 정보를 읽는데 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={openPicker} disabled={loading}>
        📷 영수증
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {loading && <RecognizingOverlay />}
    </>
  )
}

function RecognizingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/25 border-t-white" />
      <p className="text-base font-medium text-white">영수증 인식 중…</p>
      <p className="text-xs text-white/70">잠시만 기다려주세요 (보통 2~5초)</p>
    </div>
  )
}
