import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { useStore } from '../store/store'
import {
  calculateSettlement,
  totalByParticipant,
  totalByRound,
  grandTotal,
} from '../utils/calculate'
import { formatKRW } from '../utils/format'
import Button from './ui/Button'

export default function SettlementTable() {
  const participants = useStore((s) => s.participants)
  const rounds = useStore((s) => s.rounds)
  const tableRef = useRef<HTMLDivElement>(null)

  const hasData = participants.length > 0 && rounds.length > 0
  const matrix = hasData ? calculateSettlement(participants, rounds) : {}

  async function handleDownload() {
    if (!tableRef.current) return
    try {
      const dataUrl = await toPng(tableRef.current, { cacheBust: true, pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = '정산결과.png'
      link.href = dataUrl
      link.click()
    } catch {
      alert('이미지 저장에 실패했습니다.')
    }
  }

  if (!hasData) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
        참석자와 차수를 입력하면 정산 결과가 여기에 표시됩니다
      </section>
    )
  }

  const participantIds = participants.map((p) => p.id)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">정산 결과</h2>
        <Button variant="primary" onClick={handleDownload}>
          이미지 저장
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div ref={tableRef} className="inline-block min-w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 pr-4 text-left font-semibold text-gray-700 whitespace-nowrap">인원</th>
              {rounds.map((r) => (
                <th key={r.id} className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  {r.name}
                </th>
              ))}
              <th className="pl-3 py-2 text-right font-semibold text-indigo-700">합계</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-4 font-medium text-gray-800 whitespace-nowrap">{p.name}</td>
                {rounds.map((r) => {
                  const cell = matrix[p.id]?.[r.id]
                  return (
                    <td key={r.id} className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">
                      {cell?.participated ? formatKRW(cell.amount) : '—'}
                    </td>
                  )
                })}
                <td className="pl-3 py-2 text-right font-semibold text-indigo-700 whitespace-nowrap">
                  {formatKRW(totalByParticipant(matrix, p.id))}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="py-2 pr-4 font-semibold text-gray-700 whitespace-nowrap">차수 합계</td>
              {rounds.map((r) => (
                <td key={r.id} className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                  {formatKRW(totalByRound(matrix, r.id, participantIds))}
                </td>
              ))}
              <td className="pl-3 py-2 text-right font-bold text-indigo-800 whitespace-nowrap">
                {formatKRW(grandTotal(matrix))}
              </td>
            </tr>
          </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
