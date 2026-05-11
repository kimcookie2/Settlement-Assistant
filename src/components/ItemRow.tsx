import { useStore } from '../store/store'
import type { Item, Participant } from '../types'
import Button from './ui/Button'

interface ItemRowProps {
  roundId: string
  item: Item
  attendees: Participant[]
}

export default function ItemRow({ roundId, item, attendees }: ItemRowProps) {
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)

  function togglePayer(id: string) {
    const next = item.payerIds.includes(id)
      ? item.payerIds.filter((p) => p !== id)
      : [...item.payerIds, id]
    updateItem(roundId, item.id, { payerIds: next })
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-indigo-400"
          placeholder="항목 이름 (예: 술)"
          value={item.name}
          onChange={(e) => updateItem(roundId, item.id, { name: e.target.value })}
        />
        <div className="relative flex items-center">
          <span className="absolute left-2 text-gray-400 text-sm">₩</span>
          <input
            type="number"
            min={0}
            className="w-32 rounded-lg border border-gray-200 pl-6 pr-2 py-1 text-sm outline-none focus:border-indigo-400"
            placeholder="0"
            value={item.amount === 0 ? '' : item.amount}
            onChange={(e) =>
              updateItem(roundId, item.id, { amount: Number(e.target.value) || 0 })
            }
          />
        </div>
        <Button size="sm" variant="ghost" onClick={() => removeItem(roundId, item.id)}>
          ×
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {attendees.map((p) => {
          const selected = item.payerIds.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => togglePayer(p.id)}
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
  )
}
