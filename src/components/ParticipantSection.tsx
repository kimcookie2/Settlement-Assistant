import { useState } from 'react'
import { useStore } from '../store/store'
import Button from './ui/Button'
import Input from './ui/Input'

export default function ParticipantSection() {
  const [input, setInput] = useState('')
  const participants = useStore((s) => s.participants)
  const addParticipant = useStore((s) => s.addParticipant)
  const removeParticipant = useStore((s) => s.removeParticipant)
  const updateParticipant = useStore((s) => s.updateParticipant)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  function handleAdd() {
    const name = input.trim()
    if (!name) return
    addParticipant(name)
    setInput('')
  }

  function startEdit(id: string, name: string) {
    setEditingId(id)
    setEditValue(name)
  }

  function commitEdit(id: string) {
    const name = editValue.trim()
    if (name) updateParticipant(id, name)
    setEditingId(null)
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-gray-800">참석 인원</h2>

      <div className="mb-3 flex gap-2">
        <Input
          className="flex-1"
          placeholder="이름 입력"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button variant="primary" onClick={handleAdd} disabled={!input.trim()}>
          추가
        </Button>
      </div>

      {participants.length === 0 ? (
        <p className="text-center text-sm text-gray-400">참석자를 추가하세요</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1"
            >
              {editingId === p.id ? (
                <input
                  autoFocus
                  className="w-20 rounded border border-indigo-300 px-1 text-sm outline-none"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(p.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <button
                  className="text-sm font-medium text-gray-700"
                  onClick={() => startEdit(p.id, p.name)}
                >
                  {p.name}
                </button>
              )}
              <button
                className="ml-1 text-gray-400 hover:text-red-500"
                onClick={() => removeParticipant(p.id)}
                aria-label={`${p.name} 삭제`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
