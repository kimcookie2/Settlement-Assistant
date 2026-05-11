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
      applyReceipt(roundId, result.totalAmount, result.alcoholAmount)
      if (result.totalAmount === 0) {
        alert('영수증에서 금액을 인식하지 못했습니다. 사진을 다시 시도해보세요.')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '영수증 인식에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={openPicker} disabled={loading}>
        {loading ? '인식 중…' : '📷 영수증'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </>
  )
}
