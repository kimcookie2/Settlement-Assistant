import { useStore } from './store/store'
import ParticipantSection from './components/ParticipantSection'
import RoundSection from './components/RoundSection'
import SettlementTable from './components/SettlementTable'
import Button from './components/ui/Button'

export default function App() {
  const reset = useStore((s) => s.reset)

  function handleReset() {
    if (confirm('모든 데이터를 초기화하시겠습니까?')) reset()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-indigo-700">정산도우미</h1>
          <Button size="sm" variant="ghost" onClick={handleReset}>
            초기화
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-6">
        <ParticipantSection />
        <RoundSection />
        <SettlementTable />
      </main>
    </div>
  )
}
