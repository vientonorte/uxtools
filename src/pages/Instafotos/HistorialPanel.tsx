import { useState } from "react"
import type { Lang, HistorialEntry, HistorialKind } from "./types"
import { TR, getLevel } from "./data"

const PARK_NAMES: Record<string, Record<string, string>> = {
  forestal: { es: "Parque Forestal", en: "Parque Forestal", pt: "Parque Forestal" },
  lastarrias: { es: "Barrio Lastarrias", en: "Lastarrias", pt: "Lastarrias" },
  sancristobal: { es: "Cerro San Cristóbal", en: "San Cristóbal Hill", pt: "Cerro San Cristóbal" },
  bicentenario: { es: "Parque Bicentenario", en: "Bicentennial Park", pt: "Parque Bicentenário" },
  bustamante: { es: "Parque Bustamante", en: "Bustamante Park", pt: "Parque Bustamante" },
  baquedano: { es: "Plaza Baquedano", en: "Baquedano Square", pt: "Praça Baquedano" },
}

const KIND_ICON: Record<HistorialKind, string> = { roi: "💰", checkin: "✨", download: "🖼", task: "🎯" }
const KIND_COLOR: Record<HistorialKind, string> = { roi: "#16a34a", checkin: "#7c3aed", download: "#2563eb", task: "#d97706" }
const KIND_BG: Record<HistorialKind, string> = { roi: "#f0fdf4", checkin: "#faf5ff", download: "#eff6ff", task: "#fffbeb" }

interface EditState { id: string; note: string }

interface Props {
  lang: Lang
  entries: HistorialEntry[]
  setEntries: (e: HistorialEntry[]) => void
  totalPoints: number
}

export default function HistorialPanel({ lang, entries, setEntries, totalPoints }: Props) {
  const tr = TR[lang]
  const [filter, setFilter] = useState<HistorialKind | "all">("all")
  const [editing, setEditing] = useState<EditState | null>(null)
  const level = getLevel(totalPoints)

  const filtered = filter === "all" ? entries : entries.filter((e) => e.kind === filter)
  const fmt = (ts: number) => new Date(ts).toLocaleString(lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-CL", { dateStyle: "short", timeStyle: "short" })
  const parkName = (id?: string | null) => id ? (PARK_NAMES[id]?.[lang] ?? id) : tr.noLocation
  const saveEdit = () => { if (!editing) return; setEntries(entries.map((e) => e.id === editing.id ? { ...e, note: editing.note } : e)); setEditing(null) }

  const FILTERS: { v: HistorialKind | "all"; label: string }[] = [
    { v: "all", label: tr.filterAll },
    { v: "roi", label: tr.filterRoi },
    { v: "checkin", label: tr.filterCheckin },
    { v: "task", label: tr.filterTasks },
    { v: "download", label: tr.filterFlyer },
  ]

  const P1 = 3000, P2 = 5000
  const totalIncome = entries.filter((e) => e.kind === "roi" && e.session).reduce((a, e) => a + (e.session!.singles * P1 + e.session!.doubles * P2), 0)
  const totalSessions = entries.filter((e) => e.kind === "roi").length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Ganado", value: `$${totalIncome.toLocaleString("es-CL")}`, color: "#16a34a", icon: "💰" },
          { label: "Sesiones", value: String(totalSessions), color: "#2563eb", icon: "📸" },
          { label: `${level.icon} ${level.name}`, value: `${totalPoints} ⭐`, color: "#7c3aed", icon: "" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "10px 10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{s.icon} {s.label}</div>
            <div style={{ fontFamily: "Caveat,cursive", fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.1, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {FILTERS.map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${filter === f.v ? "#2563eb" : "#e2e8f0"}`, background: filter === f.v ? "#eff6ff" : "#fff", color: filter === f.v ? "#1d4ed8" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "Nunito,sans-serif" }}>
            {f.v !== "all" && KIND_ICON[f.v as HistorialKind]} {f.label}
          </button>
        ))}
        {entries.length > 0 && (
          <button onClick={() => { if (confirm("¿Borrar todo el historial?")) setEntries([]) }} style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid #fca5a5", background: "#fff7f7", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: "auto" }}>🗑</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          {tr.historialEmpty}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((entry) => (
            <div key={entry.id} style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${entry.id === editing?.id ? "#3b82f6" : "#e2e8f0"}`, overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 0 }}>
                <div style={{ width: 6, background: KIND_COLOR[entry.kind], flexShrink: 0 }} />
                {entry.kind === "download" && entry.thumbnail && (
                  <img src={entry.thumbnail} alt="flyer" style={{ width: 56, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14 }}>{KIND_ICON[entry.kind]}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: KIND_COLOR[entry.kind] }}>{tr.kindLabel[entry.kind]}</span>
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>{fmt(entry.ts)}</span>
                      </div>
                      {entry.kind === "roi" && entry.session && (
                        <div style={{ fontSize: 12, color: "#374151" }}>
                          <span style={{ fontFamily: "Caveat,cursive", fontSize: 16, fontWeight: 700, color: "#16a34a" }}>${(entry.session.singles * P1 + entry.session.doubles * P2).toLocaleString("es-CL")}</span>
                          <span style={{ color: "#6b7280" }}> · {entry.session.singles + entry.session.doubles * 2} fotos</span>
                          {entry.parkId && <span style={{ color: "#6b7280" }}> · 📍{parkName(entry.parkId)}</span>}
                        </div>
                      )}
                      {entry.kind === "checkin" && entry.checkin && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Energía {["😴","😐","🙂","😊","⚡"][entry.checkin.energy - 1]} · {entry.checkin.tasksCompleted} tareas · +{entry.checkin.pointsEarned} ⭐
                        </div>
                      )}
                      {entry.kind === "task" && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{entry.taskTitle} · +{entry.taskPoints} pts</div>
                      )}
                      {entry.kind === "download" && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{entry.lang?.toUpperCase()} {entry.parkId ? `· 📍${parkName(entry.parkId)}` : ""}</div>
                      )}
                      {entry.id === editing?.id ? (
                        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                          <input value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} style={{ flex: 1, padding: "5px 8px", borderRadius: 8, border: "1.5px solid #3b82f6", fontSize: 12, fontFamily: "Nunito,sans-serif", outline: "none" }} autoFocus />
                          <button onClick={saveEdit} style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
                          <button onClick={() => setEditing(null)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>✕</button>
                        </div>
                      ) : entry.note ? (
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, fontStyle: "italic" }}>"{entry.note}"</div>
                      ) : null}
                    </div>
                    <div style={{ background: KIND_BG[entry.kind], borderRadius: 10, padding: "3px 7px", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: KIND_COLOR[entry.kind] }}>+{entry.points} ⭐</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => setEditing({ id: entry.id, note: entry.note ?? "" })} style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", background: "#eff6ff", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>✏️ {tr.editEntry}</button>
                    <button onClick={() => setEntries(entries.filter((e) => e.id !== entry.id))} style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fff7f7", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>✕ {tr.deleteEntry}</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
