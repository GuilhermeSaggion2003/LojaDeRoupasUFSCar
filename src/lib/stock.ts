export type MovementType = 'entrada' | 'saida'

export type Movement = {
  id: string
  productId: string
  productName: string
  productSize: string
  type: MovementType
  quantity: number
  date: string
  user: string
}

export const CURRENT_USER = 'Carlos Mendes'

export const INITIAL_MOVEMENTS: Movement[] = [
  { id: 'm1', productId: 'p1', productName: 'Camiseta Básica UFSCar', productSize: 'M', type: 'entrada', quantity: 20, date: '2026-10-22T10:42:00-03:00', user: 'Carlos Mendes' },
  { id: 'm2', productId: 'p3', productName: 'Moletom Canguru Federal', productSize: 'GG', type: 'saida', quantity: 2, date: '2026-10-22T09:15:00-03:00', user: 'Juliana Rocha' },
  { id: 'm3', productId: 'p6', productName: 'Boné Aba Curva UFSCar', productSize: 'Único', type: 'saida', quantity: 1, date: '2026-10-21T17:58:00-03:00', user: 'Pedro Alves' },
  { id: 'm4', productId: 'p8', productName: 'Camiseta Baby Look Biologia', productSize: 'P', type: 'entrada', quantity: 15, date: '2026-10-21T14:20:00-03:00', user: 'Carlos Mendes' },
  { id: 'm5', productId: 'p2', productName: 'Camiseta Computação', productSize: 'G', type: 'saida', quantity: 4, date: '2026-10-21T11:03:00-03:00', user: 'Juliana Rocha' },
  { id: 'm6', productId: 'p5', productName: 'Calça Jogger Atlética', productSize: '40', type: 'entrada', quantity: 8, date: '2026-10-20T16:37:00-03:00', user: 'Carlos Mendes' },
  { id: 'm7', productId: 'p7', productName: 'Ecobag Campus São Carlos', productSize: 'Único', type: 'saida', quantity: 3, date: '2026-10-20T10:12:00-03:00', user: 'Pedro Alves' },
]

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

export function formatMovementDate(iso: string) {
  const d = new Date(iso)
  return { date: dateFormatter.format(d), time: timeFormatter.format(d) }
}
