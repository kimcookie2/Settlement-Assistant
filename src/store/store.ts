import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { Participant, Round, Item } from '../types'

interface StoreState {
  participants: Participant[]
  rounds: Round[]
  addParticipant: (name: string) => void
  removeParticipant: (id: string) => void
  updateParticipant: (id: string, name: string) => void
  addRound: () => void
  removeRound: (id: string) => void
  updateRound: (id: string, updates: Partial<Pick<Round, 'name' | 'attendeeIds' | 'totalAmount'>>) => void
  addItem: (roundId: string) => void
  removeItem: (roundId: string, itemId: string) => void
  updateItem: (roundId: string, itemId: string, updates: Partial<Omit<Item, 'id'>>) => void
  applyReceipt: (roundId: string, totalAmount: number, alcoholAmount: number) => void
  reset: () => void
}

const initialState = {
  participants: [] as Participant[],
  rounds: [] as Round[],
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...initialState,

      addParticipant: (name) =>
        set((s) => ({
          participants: [...s.participants, { id: nanoid(), name }],
        })),

      removeParticipant: (id) =>
        set((s) => ({
          participants: s.participants.filter((p) => p.id !== id),
          rounds: s.rounds.map((r) => ({
            ...r,
            attendeeIds: r.attendeeIds.filter((aid) => aid !== id),
            items: r.items.map((item) => ({
              ...item,
              payerIds: item.payerIds.filter((pid) => pid !== id),
            })),
          })),
        })),

      updateParticipant: (id, name) =>
        set((s) => ({
          participants: s.participants.map((p) => (p.id === id ? { ...p, name } : p)),
        })),

      addRound: () =>
        set((s) => {
          const defaultAttendeeIds = s.participants.map((p) => p.id)
          return {
            rounds: [
              ...s.rounds,
              {
                id: nanoid(),
                name: `${s.rounds.length + 1}차`,
                attendeeIds: defaultAttendeeIds,
                totalAmount: 0,
                items: [],
              },
            ],
          }
        }),

      removeRound: (id) =>
        set((s) => ({ rounds: s.rounds.filter((r) => r.id !== id) })),

      updateRound: (id, updates) =>
        set((s) => ({
          rounds: s.rounds.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      addItem: (roundId) =>
        set((s) => ({
          rounds: s.rounds.map((r) => {
            if (r.id !== roundId) return r
            return {
              ...r,
              items: [
                ...r.items,
                {
                  id: nanoid(),
                  name: '',
                  amount: 0,
                  payerIds: [...r.attendeeIds],
                },
              ],
            }
          }),
        })),

      removeItem: (roundId, itemId) =>
        set((s) => ({
          rounds: s.rounds.map((r) => {
            if (r.id !== roundId) return r
            return { ...r, items: r.items.filter((item) => item.id !== itemId) }
          }),
        })),

      updateItem: (roundId, itemId, updates) =>
        set((s) => ({
          rounds: s.rounds.map((r) => {
            if (r.id !== roundId) return r
            return {
              ...r,
              items: r.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item,
              ),
            }
          }),
        })),

      applyReceipt: (roundId, totalAmount, alcoholAmount) =>
        set((s) => ({
          rounds: s.rounds.map((r) => {
            if (r.id !== roundId) return r
            const items =
              alcoholAmount > 0
                ? [
                    ...r.items,
                    { id: nanoid(), name: '술', amount: alcoholAmount, payerIds: [] },
                  ]
                : r.items
            return { ...r, totalAmount, items }
          }),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'settlement-helper',
      storage: createJSONStorage(() => sessionStorage),
      version: 2,
    },
  ),
)
