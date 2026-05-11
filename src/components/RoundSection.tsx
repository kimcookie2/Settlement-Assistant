import { useStore } from '../store/store'
import Button from './ui/Button'
import RoundCard from './RoundCard'

export default function RoundSection() {
  const participants = useStore((s) => s.participants)
  const rounds = useStore((s) => s.rounds)
  const addRound = useStore((s) => s.addRound)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">차수 관리</h2>
        <Button variant="primary" onClick={addRound} disabled={participants.length === 0}>
          + 차수 추가
        </Button>
      </div>

      {rounds.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          차수를 추가하세요
        </p>
      ) : (
        rounds.map((round, i) => (
          <RoundCard key={round.id} round={round} allParticipants={participants} index={i} />
        ))
      )}
    </section>
  )
}
