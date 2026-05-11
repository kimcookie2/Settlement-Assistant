export interface Participant {
  id: string
  name: string
}

export interface Item {
  id: string
  name: string
  amount: number
  payerIds: string[]
}

export interface Round {
  id: string
  name: string
  attendeeIds: string[]
  totalAmount: number
  items: Item[]
}

export interface SettlementState {
  participants: Participant[]
  rounds: Round[]
}

export interface CellValue {
  amount: number
  participated: boolean
}

export type SettlementMatrix = Record<string, Record<string, CellValue>>
