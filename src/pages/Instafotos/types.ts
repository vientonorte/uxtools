export type Lang = "es" | "en" | "pt"
export type Tab = "flyer" | "edit" | "map" | "roi" | "apoyo" | "historial"
export type EnergyLevel = 1 | 2 | 3 | 4 | 5
export type MutismLevel = "high" | "medium" | "low"

export interface Config {
  name: string
  instagram: string
  price1: string
  price2: string
  tagline: Record<Lang, string>
  price1lbl: Record<Lang, string>
  price2lbl: Record<Lang, string>
  payment: Record<Lang, string>
}

export interface Park {
  id: string
  names: Record<Lang, string>
  area: string
  emoji: string
  lat: number
  lng: number
  isCustom?: boolean
}

export interface MeetingPoint {
  id: string
  names: Record<Lang, string>
  parkId: string
  lat: number
  lng: number
  active: boolean
  isCustom?: boolean
}

export interface RoiSession {
  id: string
  ts: number
  parkId: string | null
  singles: number
  doubles: number
  notes: string
  energy?: EnergyLevel
  points: number
}

export interface DailyCheckin {
  id: string
  ts: number
  energy: EnergyLevel
  mutism: MutismLevel
  notes: string
  tasksCompleted: number
  pointsEarned: number
}

export interface Task {
  id: string
  title: Record<Lang, string>
  points: number
  category: "ops" | "comms" | "care" | "extra"
  done: boolean
  doneAt?: number
  isCustom?: boolean
}

export type HistorialKind = "roi" | "checkin" | "download" | "task"

export interface HistorialEntry {
  id: string
  ts: number
  kind: HistorialKind
  lang?: Lang
  parkId?: string | null
  config?: Config
  thumbnail?: string
  session?: RoiSession
  checkin?: DailyCheckin
  taskTitle?: string
  taskPoints?: number
  points: number
  note?: string
}
