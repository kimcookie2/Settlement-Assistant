import { useStore } from '../store/store'
import type { Round, Participant } from '../types'
import { formatKRW } from '../utils/format'
import Button from './ui/Button'
import ItemRow from './ItemRow'

interface RoundCardProps {
  round: Round
  allParticipants: Participant[]
  index: number
}

export default function RoundCard({ round, allParticipants, index }: RoundCardProps) {
  const updateRound = useStore((s) => s.updateRound)
  const removeRound = useStore((s) => s.removeRound)
  const addItem = useStore((s) => s.addItem)

  const attendees = allParticipants.filter((p) => round.attendeeIds.includes(p.id))
  const itemsTotal = round.items.reduce((sum, item) => sum + Math.max(0, item.amount), 0)
  const overflow = itemsTotal > round.totalAmount
  const commonAmount = Math.max(0, round.totalAmount - itemsTotal)
  const commonShare =
    attendees.length > 0 ? Math.floor(commonAmount / attendees.length) : 0

  function toggleAttendee(id: string) {
    const next = round.attendeeIds.includes(id)
      ? round.attendeeIds.filter((a) => a !== id)
      : [...round.attendeeIds, id]
    updateRound(round.id, { attendeeIds: next })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium outline-none focus:border-indigo-400"
          value={round.name}
          onChange={(e) => updateRound(round.id, { name: e.target.value })}
          placeholder={`${index + 1}차`}
        />
        <Button size="sm" variant="danger" onClick={() => removeRound(round.id)}>
          삭제
        </Button>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-500">참석자</p>
        <div className="flex flex-wrap gap-1.5">
          {allParticipants.map((p) => {
            const selected = round.attendeeIds.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggleAttendee(p.id)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500">전체 금액</label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-gray-400 text-sm">₩</span>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            placeholder="0"
            value={round.totalAmount === 0 ? '' : round.totalAmount}
            onChange={(e) =>
              updateRound(round.id, { totalAmount: Number(e.target.value) || 0 })
            }
          />
        </div>
        {attendees.length > 0 && round.totalAmount > 0 && (
          overflow ? (
            <p className="text-xs text-red-600">
              ⚠ 항목 합계 {formatKRW(itemsTotal)}이 전체 금액을 초과합니다
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              공통 {formatKRW(commonAmount)} · {attendees.length}명 균등 (인당 {formatKRW(commonShare)})
            </p>
          )
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-gray-500">
          항목 (특정 인원이 부담)
        </p>
        {round.items.map((item) => (
          <ItemRow key={item.id} roundId={round.id} item={item} attendees={attendees} />
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={() => addItem(round.id)}
          disabled={attendees.length === 0}
        >
          + 항목 추가
        </Button>
      </div>
    </div>
  )
}
