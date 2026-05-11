import type { Participant, Round, SettlementMatrix } from '../types'

export function calculateSettlement(
  participants: Participant[],
  rounds: Round[],
): SettlementMatrix {
  const matrix: SettlementMatrix = {}

  for (const p of participants) {
    matrix[p.id] = {}
    for (const r of rounds) {
      matrix[p.id][r.id] = { amount: 0, participated: r.attendeeIds.includes(p.id) }
    }
  }

  for (const round of rounds) {
    if (round.attendeeIds.length === 0) continue

    const itemsTotal = round.items.reduce((sum, item) => sum + Math.max(0, item.amount), 0)
    const commonAmount = Math.max(0, round.totalAmount - itemsTotal)

    if (commonAmount > 0) {
      const commonShare = Math.floor(commonAmount / round.attendeeIds.length)
      for (const attendeeId of round.attendeeIds) {
        if (matrix[attendeeId]?.[round.id] !== undefined) {
          matrix[attendeeId][round.id].amount += commonShare
        }
      }
    }

    for (const item of round.items) {
      if (item.payerIds.length === 0 || item.amount <= 0) continue
      const share = Math.floor(item.amount / item.payerIds.length)
      for (const payerId of item.payerIds) {
        if (matrix[payerId]?.[round.id] !== undefined) {
          matrix[payerId][round.id].amount += share
        }
      }
    }
  }

  return matrix
}

export function totalByParticipant(matrix: SettlementMatrix, participantId: string): number {
  const row = matrix[participantId]
  if (!row) return 0
  return Object.values(row).reduce((sum, cell) => sum + cell.amount, 0)
}

export function totalByRound(
  matrix: SettlementMatrix,
  roundId: string,
  participantIds: string[],
): number {
  return participantIds.reduce((sum, pid) => {
    return sum + (matrix[pid]?.[roundId]?.amount ?? 0)
  }, 0)
}

export function grandTotal(matrix: SettlementMatrix): number {
  return Object.values(matrix).reduce((sum, row) => {
    return sum + Object.values(row).reduce((s, cell) => s + cell.amount, 0)
  }, 0)
}
