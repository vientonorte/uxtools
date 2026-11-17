import { useState } from "react"
import type { Lang, EnergyLevel, MutismLevel, Task, DailyCheckin, HistorialEntry } from "./types"
import { TR, CATEGORY_META, DEFAULT_TASKS, getLevel } from "./data"

interface Props {
  lang: Lang
  totalPoints: number
  addHistorial: (e: HistorialEntry) => void
  tasks: Task[]
  setTasks: (t: Task[]) => void
}

const ENERGY_OPTS: { v: EnergyLevel; emoji: string }[] = [
  { v: 1, emoji: "😴" }, { v: 2, emoji: "😐" }, { v: 3, emoji: "🙂" }, { v: 4, emoji: "😊" }, { v: 5, emoji: "⚡" },
]

export default function ApoyoPanel({ lang, totalPoints, addHistorial, tasks, setTasks }: Props) {
  const tr = TR[lang]
  const level = getLevel(totalPoints)
  const levelNext = getLevel(totalPoints + 1)
  const progress = levelNext.min <= totalPoints ? 100 : Math.round(((totalPoints - level.min) / (levelNext.min - level.min)) * 100)

  const [energy, setEnergy] = useState<EnergyLevel>(3)
  const [mutism, setMutism] = useState<MutismLevel>("low")
  const [checkinNotes, setCheckinNotes] = useState("")
  const [checkedIn, setCheckedIn] = useState(false)
  const [fullscreenCard, setFullscreenCard] = useState<(typeof tr.commCards)[0] | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [showAddTask, setShowAddTask] = useState(false)

  const MUTISM_OPTS: { v: MutismLevel; icon: string; label: string; color: string }[] = [
    { v: "high", icon: "🔇", label: tr.mutismHigh, color: "#ef4444" },
    { v: "medium", icon: "🔉", label: tr.mutismMed, color: "#f59e0b" },
    { v: "low", icon: "🔊", label: tr.mutismLow, color: "#16a34a" },
  ]

  const saveCheckin = () => {
    const pts = 20 + (energy >= 4 ? 10 : 0)
    const checkin: DailyCheckin = { id: Date.now().toString(), ts: Date.now(), energy, mutism, notes: checkinNotes, tasksCompleted: tasks.filter((t) => t.done).length, pointsEarned: pts }
    addHistorial({ id: Date.now().toString(), ts: Date.now(), kind: "checkin", checkin, points: pts })
    setCheckedIn(true)
  }

  const toggleTask = (task: Task) => {
    if (task.done) return
    setTasks(tasks.map((t) => t.id === task.id ? { ...t, done: true, doneAt: Date.now() } : t))
    addHistorial({ id: Date.now().toString(), ts: Date.now(), kind: "task", taskTitle: task.title[lang], taskPoints: task.points, points: task.points })
  }

  const addCustomTask = () => {
    if (!newTaskTitle.trim()) return
    setTasks([...tasks, { id: Date.now().toString(), title: { es: newTaskTitle, en: newTaskTitle, pt: newTaskTitle }, points: 15, category: "extra", done: false, isCustom: true }])
    setNewTaskTitle(""); setShowAddTask(false)
  }

  const doneTasks = tasks.filter((t) => t.done)
  const pendingTasks = tasks.filter((t) => !t.done)
  const todayPoints = doneTasks.reduce((a, t) => a + t.points, 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Level badge */}
      <div style={{ background: "linear-gradient(135deg,#fdf4ff,#eff6ff)", borderRadius: 20, padding: "16px 18px", border: "1.5px solid #e9d5ff", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{level.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, color: "#4c1d95" }}>{level.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <div style={{ flex: 1, height: 8, background: "#e9d5ff", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#f59e0b,#ec4899,#7c3aed)", borderRadius: 4, transition: "width .4s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed", flexShrink: 0 }}>{totalPoints} ⭐</span>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Próximo: {levelNext.icon} {levelNext.name}</div>
        </div>
      </div>

      {/* Daily check-in */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f9ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a" }}>✨ {tr.checkinTitle}</span>
          {checkedIn && <span style={{ fontSize: 11, background: "#fffbeb", color: "#d97706", fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>+20 ⭐ ✓</span>}
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>{tr.energyLabel}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {ENERGY_OPTS.map((o) => (
                <button key={o.v} onClick={() => setEnergy(o.v)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `2px solid ${energy === o.v ? "#7c3aed" : "#e2e8f0"}`, background: energy === o.v ? "#f5f3ff" : "#f9fafb", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 20 }}>{o.emoji}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: energy === o.v ? "#7c3aed" : "#9ca3af" }}>{o.v}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>{tr.mutismLabel}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {MUTISM_OPTS.map((o) => (
                <button key={o.v} onClick={() => setMutism(o.v)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: `2px solid ${mutism === o.v ? o.color : "#e2e8f0"}`, background: "#f9fafb", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 22 }}>{o.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: mutism === o.v ? o.color : "#9ca3af", textAlign: "center", lineHeight: 1.2 }}>{o.label}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, padding: "8px 12px", background: mutism === "high" ? "#fef2f2" : mutism === "medium" ? "#fffbeb" : "#f0fdf4", borderRadius: 10, border: `1px solid ${mutism === "high" ? "#fca5a5" : mutism === "medium" ? "#fde68a" : "#bbf7d0"}` }}>
              <span style={{ fontSize: 12, color: mutism === "high" ? "#dc2626" : mutism === "medium" ? "#d97706" : "#16a34a", fontWeight: 600 }}>{tr.mutismNote[mutism]}</span>
            </div>
          </div>
          <textarea value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} placeholder="Notas del día (opcional)..." rows={2} style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "Nunito,sans-serif", resize: "none", outline: "none" }} />
          <button onClick={saveCheckin} disabled={checkedIn} style={{ padding: "10px", borderRadius: 12, border: "none", background: checkedIn ? "#e5e7eb" : "linear-gradient(135deg,#7c3aed,#6d28d9)", color: checkedIn ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: 14, cursor: checkedIn ? "default" : "pointer" }}>
            {checkedIn ? "✓ Check-in guardado" : tr.checkinSave}
          </button>
        </div>
      </div>

      {/* Communication cards */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f9ff" }}>
          <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a" }}>💬 {tr.commTitle}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{tr.commSub}</div>
        </div>
        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {tr.commCards.map((card) => (
            <button key={card.id} onClick={() => setFullscreenCard(card)} style={{ padding: "14px 10px", borderRadius: 14, border: "1.5px solid #e9d5ff", background: "linear-gradient(135deg,#faf5ff,#f5f3ff)", cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 28 }}>{card.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#4c1d95", whiteSpace: "pre-line", lineHeight: 1.3 }}>{card.text}</span>
              <span style={{ fontSize: 10, color: "#a78bfa" }}>{card.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f9ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a" }}>🎯 {tr.tasksTitle}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>+{todayPoints} ⭐ hoy · {doneTasks.length}/{tasks.length} completadas</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setTasks(DEFAULT_TASKS)} style={{ fontSize: 11, color: "#6b7280", background: "#f1f5f9", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>↺</button>
            <button onClick={() => setShowAddTask(true)} style={{ fontSize: 11, color: "#fff", background: "#2563eb", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>+ {tr.addTask}</button>
          </div>
        </div>
        {showAddTask && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f9ff", background: "#f8faff", display: "flex", gap: 8 }}>
            <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Nombre de la tarea..." onKeyDown={(e) => e.key === "Enter" && addCustomTask()} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #bfdbfe", fontSize: 13, fontFamily: "Nunito,sans-serif", outline: "none" }} autoFocus />
            <button onClick={addCustomTask} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✓</button>
            <button onClick={() => setShowAddTask(false)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer" }}>✕</button>
          </div>
        )}
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(CATEGORY_META).map(([cat, meta]) => {
            const catTasks = pendingTasks.filter((t) => t.category === cat)
            if (!catTasks.length) return null
            return (
              <div key={cat}>
                <div style={{ fontSize: 10, fontWeight: 800, color: meta.color, padding: "4px 4px 2px", textTransform: "uppercase", letterSpacing: ".5px" }}>{meta.icon} {meta.label[lang]}</div>
                {catTasks.map((task) => (
                  <button key={task.id} onClick={() => toggleTask(task)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: meta.bg, cursor: "pointer", marginBottom: 4, textAlign: "left" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${meta.color}`, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#374151" }}>{task.title[lang]}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, flexShrink: 0 }}>+{task.points} ⭐</span>
                  </button>
                ))}
              </div>
            )
          })}
          {doneTasks.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", padding: "4px 4px 2px", textTransform: "uppercase" }}>✓ Completadas</div>
              {doneTasks.map((task) => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e7eb", marginBottom: 4, opacity: 0.6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: "#fff" }}>✓</span>
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: "#6b7280", textDecoration: "line-through" }}>{task.title[lang]}</span>
                  <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>+{task.points} ⭐</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {fullscreenCard && (
        <div onClick={() => setFullscreenCard(null)} style={{ position: "fixed", inset: 0, background: "linear-gradient(135deg,#4c1d95,#1e40af)", zIndex: 3000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, cursor: "pointer" }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>{fullscreenCard.emoji}</div>
          <div style={{ fontFamily: "Caveat,cursive", fontSize: 42, fontWeight: 700, color: "#fff", textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.2, marginBottom: 16 }}>{fullscreenCard.text}</div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,.7)", textAlign: "center" }}>{fullscreenCard.sub}</div>
          <div style={{ position: "absolute", bottom: 32, fontSize: 14, color: "rgba(255,255,255,.5)" }}>Toca para cerrar</div>
        </div>
      )}
    </div>
  )
}
