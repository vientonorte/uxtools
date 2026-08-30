import './camila.css'
import { useState, useRef, useCallback, useEffect } from "react"
import { toPng } from "html-to-image"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import type { Lang, Tab, Config, Park, MeetingPoint, RoiSession, HistorialEntry, Task } from "./types"
import { TR, INITIAL_CONFIG, DEFAULT_PARKS, DEFAULT_MEETING_POINTS, DEFAULT_TASKS, CATEGORY_META, getLevel } from "./data"
import FlyerCard from "./FlyerCard"
import ApoyoPanel from "./ApoyoPanel"
import HistorialPanel from "./HistorialPanel"

function useIsDesktop() {
  const [ok, setOk] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768)
  useEffect(() => {
    const h = () => setOk(window.innerWidth >= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])
  return ok
}

function parkIcon(emoji: string, selected: boolean, sessionCount = 0) {
  const s = selected ? 44 : 36
  const badge = sessionCount > 0 ? `<div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:#f59e0b;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff">${sessionCount}</div>` : ""
  return L.divIcon({
    html: `<div style="position:relative;width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;background:${selected ? "#2563eb" : "#fff"};border:3px solid ${selected ? "#fff" : sessionCount > 0 ? "#f59e0b" : "#3b82f6"};border-radius:50%;box-shadow:0 4px 14px rgba(37,99,235,${selected ? 0.55 : 0.2});font-size:${selected ? 22 : 18}px">${emoji}${badge}</div>`,
    className: "",
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  })
}

function meetingIcon() {
  return L.divIcon({
    html: `<div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:#fef3c7;border:2.5px solid #f59e0b;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.15);font-size:13px">⭐</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

function MapFly({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  map.setView([lat, lng], 16, { animate: true })
  return null
}

interface EditProps { lang: Lang; config: Config; setConfig: (c: Config) => void; parks: Park[]; setParks: (p: Park[]) => void; meetingPoints: MeetingPoint[]; setMeetingPoints: (m: MeetingPoint[]) => void }

function EditPanel({ lang, config, setConfig, parks, setParks, meetingPoints, setMeetingPoints }: EditProps) {
  const tr = TR[lang]
  const set = (p: Partial<Config>) => setConfig({ ...config, ...p })
  const setN = <K extends "tagline" | "payment" | "price1lbl" | "price2lbl">(k: K, l: Lang, v: string) => setConfig({ ...config, [k]: { ...config[k], [l]: v } })
  const [showAddLoc, setShowAddLoc] = useState(false)
  const emptyLoc = { emoji: "📍", nameEs: "", nameEn: "", namePt: "", area: "", lat: "", lng: "" }
  const [newLoc, setNewLoc] = useState(emptyLoc)

  const F = ({ label, value, onChange, small }: { label: string; value: string; onChange: (v: string) => void; small?: boolean }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 3, textTransform: "uppercase" }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: small ? "7px 10px" : "9px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: small ? 12 : 14, fontFamily: "Nunito,sans-serif", outline: "none", color: "#1e3a8a", fontWeight: 600, background: "#f8faff" }} onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
    </div>
  )

  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: ".7px" }}>{title}</p>
      {children}
    </div>
  )

  const saveLoc = () => {
    if (!newLoc.nameEs.trim()) return
    const park: Park = { id: `custom-${Date.now()}`, names: { es: newLoc.nameEs, en: newLoc.nameEn || newLoc.nameEs, pt: newLoc.namePt || newLoc.nameEs }, area: newLoc.area, emoji: newLoc.emoji, lat: parseFloat(newLoc.lat) || -33.437, lng: parseFloat(newLoc.lng) || -70.634, isCustom: true }
    setParks([...parks, park]); setNewLoc(emptyLoc); setShowAddLoc(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>{tr.editTitle}</h2>
      <Block title="Identidad">
        <F label={tr.fieldName} value={config.name} onChange={(v) => set({ name: v })} />
        <F label={tr.fieldInsta} value={config.instagram} onChange={(v) => set({ instagram: v })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <F label={tr.fieldPrice1} value={config.price1} onChange={(v) => set({ price1: v })} />
          <F label={tr.fieldPrice2} value={config.price2} onChange={(v) => set({ price2: v })} />
        </div>
      </Block>
      <Block title="Tagline">
        <F label="🇨🇱 ES" value={config.tagline.es} onChange={(v) => setN("tagline", "es", v)} />
        <F label="🇬🇧 EN" value={config.tagline.en} onChange={(v) => setN("tagline", "en", v)} />
        <F label="🇧🇷 PT" value={config.tagline.pt} onChange={(v) => setN("tagline", "pt", v)} />
      </Block>
      <Block title="Pago / Payment">
        <F label="🇨🇱 ES" value={config.payment.es} onChange={(v) => setN("payment", "es", v)} />
        <F label="🇬🇧 EN" value={config.payment.en} onChange={(v) => setN("payment", "en", v)} />
        <F label="🇧🇷 PT" value={config.payment.pt} onChange={(v) => setN("payment", "pt", v)} />
      </Block>
      <Block title={tr.meetingTitle}>
        {meetingPoints.map((mp) => {
          const park = parks.find((p) => p.id === mp.parkId)
          return (
            <div key={mp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: mp.active ? "#fffbeb" : "#f9fafb", borderRadius: 10, border: `1.5px solid ${mp.active ? "#fcd34d" : "#e2e8f0"}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}>{mp.names[lang]}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{park?.emoji} {park?.names[lang]}</div>
              </div>
              <button onClick={() => setMeetingPoints(meetingPoints.map((m) => m.id === mp.id ? { ...m, active: !m.active } : m))} style={{ padding: "4px 10px", borderRadius: 20, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: mp.active ? "#fcd34d" : "#e5e7eb", color: mp.active ? "#78350f" : "#6b7280" }}>
                ⭐ {mp.active ? tr.meetingActive : tr.meetingInactive}
              </button>
            </div>
          )
        })}
      </Block>
      <Block title={tr.addLocation}>
        {parks.filter((p) => p.isCustom).map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#f8faff", borderRadius: 10, border: "1.5px solid #bfdbfe" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>{p.emoji}</span>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}>{p.names[lang]}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{p.area}</div></div>
            </div>
            <button onClick={() => setParks(parks.filter((x) => x.id !== p.id))} style={{ fontSize: 13, color: "#dc2626", background: "#fff7f7", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>✕</button>
          </div>
        ))}
        {showAddLoc ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#f8faff", borderRadius: 12, border: "1.5px dashed #bfdbfe" }}>
            <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 8 }}>
              <F label={tr.fieldEmoji} value={newLoc.emoji} onChange={(v) => setNewLoc({ ...newLoc, emoji: v })} small />
              <F label={tr.fieldArea} value={newLoc.area} onChange={(v) => setNewLoc({ ...newLoc, area: v })} small />
            </div>
            <F label={tr.fieldNameEs} value={newLoc.nameEs} onChange={(v) => setNewLoc({ ...newLoc, nameEs: v })} small />
            <F label={tr.fieldNameEn} value={newLoc.nameEn} onChange={(v) => setNewLoc({ ...newLoc, nameEn: v })} small />
            <F label={tr.fieldNamePt} value={newLoc.namePt} onChange={(v) => setNewLoc({ ...newLoc, namePt: v })} small />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label={`${tr.fieldLat} (ej: -33.437)`} value={newLoc.lat} onChange={(v) => setNewLoc({ ...newLoc, lat: v })} small />
              <F label={`${tr.fieldLng} (ej: -70.634)`} value={newLoc.lng} onChange={(v) => setNewLoc({ ...newLoc, lng: v })} small />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => setShowAddLoc(false)} style={{ padding: "9px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f9fafb", color: "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{tr.cancel}</button>
              <button onClick={saveLoc} style={{ padding: "9px", borderRadius: 10, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{tr.save}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddLoc(true)} style={{ padding: "10px", borderRadius: 12, border: "1.5px dashed #bfdbfe", background: "#f8faff", color: "#2563eb", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" }}>+ {tr.addLocation}</button>
        )}
      </Block>
    </div>
  )
}

interface MapProps { lang: Lang; parks: Park[]; meetingPoints: MeetingPoint[]; selectedPark: string | null; onSelect: (id: string | null) => void; sessions: RoiSession[] }

function MapPanel({ lang, parks, meetingPoints, selectedPark, onSelect, sessions }: MapProps) {
  const tr = TR[lang]
  const park = parks.find((p) => p.id === selectedPark)
  const sessionsByPark: Record<string, number> = {}
  sessions.forEach((s) => { if (s.parkId) sessionsByPark[s.parkId] = (sessionsByPark[s.parkId] ?? 0) + 1 })
  const conqueredCount = Object.keys(sessionsByPark).length
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>{tr.mapTitle}</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>{tr.mapSub}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "linear-gradient(135deg,#fffbeb,#fef9c3)", borderRadius: 14, border: "1.5px solid #fde68a" }}>
        <span style={{ fontSize: 24 }}>🏆</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>{tr.conqueredParks}: {conqueredCount}/{parks.length}</div>
          {conqueredCount < parks.length && <div style={{ fontSize: 11, color: "#b45309" }}>{tr.visitAll}</div>}
          {conqueredCount >= parks.length && <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>🎉 ¡Todos los lugares conquistados!</div>}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>{parks.map((p) => <span key={p.id} style={{ fontSize: 14, opacity: sessionsByPark[p.id] ? 1 : 0.25 }}>{p.emoji}</span>)}</div>
      </div>
      <MapContainer center={[-33.437, -70.634]} zoom={13} style={{ height: 280, width: "100%", borderRadius: 16 }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {parks.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={parkIcon(p.emoji, selectedPark === p.id, sessionsByPark[p.id] ?? 0)} eventHandlers={{ click: () => onSelect(selectedPark === p.id ? null : p.id) }}>
            <Popup><strong>{p.names[lang]}</strong><br />{p.area}</Popup>
          </Marker>
        ))}
        {meetingPoints.filter((mp) => mp.active).map((mp) => (
          <Marker key={mp.id} position={[mp.lat, mp.lng]} icon={meetingIcon()}>
            <Popup><strong>⭐ {mp.names[lang]}</strong></Popup>
          </Marker>
        ))}
        {park && <MapFly lat={park.lat} lng={park.lng} />}
      </MapContainer>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {parks.map((p) => {
          const sel = selectedPark === p.id; const sc = sessionsByPark[p.id] ?? 0
          return (
            <button key={p.id} onClick={() => onSelect(sel ? null : p.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${sel ? "#3b82f6" : sc > 0 ? "#fde68a" : "#e2e8f0"}`, background: sel ? "#eff6ff" : sc > 0 ? "#fffbeb" : "#fff", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 20 }}>{p.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: sel ? "#1d4ed8" : "#374151" }}>{p.names[lang]}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{p.area}</div>
              </div>
              {sc > 0 && <span style={{ fontSize: 14 }}>⭐</span>}
            </button>
          )
        })}
      </div>
      {selectedPark && <button onClick={() => onSelect(null)} style={{ padding: "8px 16px", borderRadius: 20, border: "1.5px solid #fca5a5", background: "#fff7f7", color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ {tr.clearPark}</button>}
    </div>
  )
}

interface RoiProps { lang: Lang; selectedPark: string | null; parks: Park[]; sessions: RoiSession[]; setSessions: (s: RoiSession[]) => void; addHistorial: (e: HistorialEntry) => void }

function ROIPanel({ lang, selectedPark, parks, sessions, setSessions, addHistorial }: RoiProps) {
  const tr = TR[lang]
  const [singles, setSingles] = useState(0)
  const [doubles, setDoubles] = useState(0)
  const [notes, setNotes] = useState("")
  const [last, setLast] = useState<"s" | "d" | null>(null)
  const P1 = 3000, P2 = 5000
  const sessionIncome = singles * P1 + doubles * P2
  const totalIncome = sessions.reduce((a, s) => a + s.singles * P1 + s.doubles * P2, 0)
  const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-CL", { day: "2-digit", month: "short" })
  const addS = () => { setSingles((n) => n + 1); setLast("s") }
  const addD = () => { setDoubles((n) => n + 1); setLast("d") }
  const undo = () => { if (last === "s" && singles > 0) setSingles((n) => n - 1); if (last === "d" && doubles > 0) setDoubles((n) => n - 1); setLast(null) }
  const saveSession = () => {
    if (singles === 0 && doubles === 0) return
    const pts = 50 + singles * 5 + doubles * 8
    const session: RoiSession = { id: Date.now().toString(), ts: Date.now(), parkId: selectedPark, singles, doubles, notes, points: pts }
    setSessions([session, ...sessions])
    addHistorial({ id: Date.now().toString(), ts: Date.now(), kind: "roi", parkId: selectedPark, session, points: pts })
    setSingles(0); setDoubles(0); setNotes(""); setLast(null)
  }
  const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div style={{ background: "#fff", borderRadius: 14, padding: "10px 12px", border: "1px solid #e2e8f0", flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    </div>
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>{tr.roiTitle}</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <Stat label={tr.roiTotal} value={fmt(totalIncome)} color="#16a34a" />
        <Stat label={tr.roiSessions} value={String(sessions.length)} color="#2563eb" />
        <Stat label={tr.roiAvg} value={sessions.length ? fmt(Math.round(totalIncome / sessions.length)) : "$0"} color="#7c3aed" />
      </div>
      <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1.5px solid #dbeafe", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a" }}>{tr.roiToday}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={addS} style={{ padding: "14px", borderRadius: 14, border: "2px solid #bfdbfe", background: "#eff6ff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: "Caveat,cursive", fontSize: 32, fontWeight: 700, color: "#2563eb" }}>{singles}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>📸 {tr.roiAdd1}</span>
            <span style={{ fontSize: 10, color: "#93c5fd" }}>{fmt(P1)} c/u</span>
          </button>
          <button onClick={addD} style={{ padding: "14px", borderRadius: 14, border: "2px solid #c4b5fd", background: "#f5f3ff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: "Caveat,cursive", fontSize: 32, fontWeight: 700, color: "#7c3aed" }}>{doubles}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>📸📸 {tr.roiAdd2}</span>
            <span style={{ fontSize: 10, color: "#c4b5fd" }}>{fmt(P2)} pack</span>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
          <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>💰 Sesión actual</span>
          <span style={{ fontFamily: "Caveat,cursive", fontSize: 24, fontWeight: 700, color: "#16a34a" }}>{fmt(sessionIncome)}</span>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr.roiNotes} rows={2} style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "Nunito,sans-serif", resize: "none", outline: "none" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <button onClick={undo} disabled={!last} style={{ padding: "10px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: last ? "#fff" : "#f9fafb", color: last ? "#374151" : "#d1d5db", fontWeight: 700, fontSize: 13, cursor: last ? "pointer" : "default" }}>↩ {tr.roiUndo}</button>
          <button onClick={saveSession} disabled={singles + doubles === 0} style={{ padding: "10px", borderRadius: 12, border: "none", background: singles + doubles > 0 ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#e5e7eb", color: singles + doubles > 0 ? "#fff" : "#9ca3af", fontWeight: 700, fontSize: 13, cursor: singles + doubles > 0 ? "pointer" : "default" }}>✓ {tr.roiSave}</button>
        </div>
      </div>
      {sessions.length > 0 && (
        <div>
          <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>{tr.roiHistory}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sessions.map((s) => {
              const inc = s.singles * P1 + s.doubles * P2
              const park = parks.find((p) => p.id === s.parkId)
              return (
                <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: "10px 14px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "Caveat,cursive", fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{fmt(inc)}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(s.ts)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>📸×{s.singles + s.doubles * 2} · {park ? `${park.emoji} ${park.names[lang]}` : tr.noLocation}</div>
                  </div>
                  <button onClick={() => setSessions(sessions.filter((x) => x.id !== s.id))} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#fff7f7", color: "#ef4444", fontSize: 14, cursor: "pointer" }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const TABS: { id: Tab; icon: string }[] = [
  { id: "flyer", icon: "🖼" }, { id: "edit", icon: "✏️" }, { id: "map", icon: "🗺" },
  { id: "roi", icon: "💰" }, { id: "apoyo", icon: "🌈" }, { id: "historial", icon: "📋" },
]
const LANG_FLAGS: Record<Lang, string> = { es: "🇨🇱", en: "🇬🇧", pt: "🇧🇷" }

export default function Camila() {
  const isDesktop = useIsDesktop()
  const [lang, setLang] = useState<Lang>("es")
  const [tab, setTab] = useState<Tab>("flyer")
  const [selectedPark, setSelectedPark] = useState<string | null>(null)
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG)
  const [parks, setParks] = useState<Park[]>(DEFAULT_PARKS)
  const [meetingPoints, setMeetingPoints] = useState<MeetingPoint[]>(DEFAULT_MEETING_POINTS)
  const [sessions, setSessions] = useState<RoiSession[]>([])
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const flyerRef = useRef<HTMLDivElement>(null)

  const tr = TR[lang]
  const parkData = parks.find((p) => p.id === selectedPark) ?? null
  const totalPoints = historial.reduce((a, e) => a + e.points, 0)
  const level = getLevel(totalPoints)

  const addHistorial = useCallback((e: HistorialEntry) => setHistorial((h) => [e, ...h].slice(0, 100)), [])

  const handleDownload = useCallback(async () => {
    if (!flyerRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(flyerRef.current, { pixelRatio: 3, cacheBust: true })
      const link = document.createElement("a")
      link.download = `flyer-${lang}${selectedPark ? `-${selectedPark}` : ""}.png`
      link.href = dataUrl
      link.click()
      addHistorial({ id: Date.now().toString(), ts: Date.now(), kind: "download", lang, parkId: selectedPark, config: { ...config }, thumbnail: dataUrl, points: 5 })
    } catch (e) { console.error(e) } finally { setDownloading(false) }
  }, [lang, selectedPark, config, addHistorial])

  const NavItem = ({ id, icon }: { id: Tab; icon: string }) => {
    const active = tab === id
    return (
      <button onClick={() => setTab(id)} style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", alignItems: "center", gap: isDesktop ? 10 : 2, padding: isDesktop ? "10px 16px" : "5px 8px", borderRadius: isDesktop ? 12 : 10, border: "none", cursor: "pointer", width: isDesktop ? "100%" : "auto", background: active ? "#eff6ff" : "transparent", transition: "all .15s", minWidth: isDesktop ? "auto" : 52, flexShrink: 0 }}>
        <span style={{ fontSize: isDesktop ? 20 : active ? 21 : 19 }}>{icon}</span>
        <span style={{ fontSize: isDesktop ? 14 : 10, fontWeight: 700, color: active ? "#2563eb" : "#9ca3af", fontFamily: "Nunito,sans-serif", whiteSpace: "nowrap" }}>{tr.tabs[id]}</span>
        {active && isDesktop && <div style={{ marginLeft: "auto", width: 4, height: 20, background: "#2563eb", borderRadius: 2 }} />}
        {active && !isDesktop && <div style={{ width: 18, height: 3, background: "#2563eb", borderRadius: 2, marginTop: 1 }} />}
      </button>
    )
  }

  return (
    <div className="camila-overlay" style={{ background: "linear-gradient(160deg,#eff6ff 0%,#e0f2fe 50%,#f0fdf4 100%)", fontFamily: "Nunito,sans-serif", flexDirection: isDesktop ? "row" : "column" }}>
      {isDesktop && (
        <div style={{ width: 200, flexShrink: 0, background: "rgba(255,255,255,.92)", borderRight: "1px solid #e0eaff", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
          <div style={{ padding: "20px 16px 14px" }}>
            <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a", lineHeight: 1 }}>{config.name}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Instafotos App · Santiago</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "linear-gradient(135deg,#fdf4ff,#eff6ff)", borderRadius: 10 }}>
              <span style={{ fontSize: 18 }}>{level.icon}</span>
              <div><div style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed" }}>{level.name}</div><div style={{ fontSize: 10, color: "#a78bfa" }}>{totalPoints} ⭐</div></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 3, padding: "0 12px 12px", flexWrap: "wrap" }}>
            {(["es", "en", "pt"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: "3px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: lang === l ? "#2563eb" : "#f1f5f9", color: lang === l ? "#fff" : "#6b7280", fontFamily: "Nunito,sans-serif" }}>{LANG_FLAGS[l]} {l.toUpperCase()}</button>
            ))}
          </div>
          <nav style={{ padding: "4px 10px", display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {TABS.map(({ id, icon }) => <NavItem key={id} id={id} icon={icon} />)}
          </nav>
          <div style={{ padding: "12px 14px", borderTop: "1px solid #e0eaff" }}>
            <button onClick={() => setShowHelpModal(true)} style={{ width: "100%", padding: "9px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>🆘 Ayuda — Rodrigo</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" }}>
        {!isDesktop && (
          <div style={{ background: "rgba(255,255,255,.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid #e0eaff", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "Caveat,cursive", fontSize: 18, fontWeight: 700, color: "#1e3a8a", lineHeight: 1 }}>{config.name}</div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>Instafotos App · {level.icon} {level.name} · {totalPoints} ⭐</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setShowHelpModal(true)} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🆘</button>
              <div style={{ display: "flex", gap: 2, background: "#f1f5f9", borderRadius: 10, padding: 3 }}>
                {(["es", "en", "pt"] as Lang[]).map((l) => (
                  <button key={l} onClick={() => setLang(l)} style={{ padding: "3px 6px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: lang === l ? "#2563eb" : "transparent", color: lang === l ? "#fff" : "#6b7280", fontFamily: "Nunito,sans-serif" }}>{LANG_FLAGS[l]}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: isDesktop ? "24px 32px" : "16px 14px 88px" }}>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {tab === "flyer" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                <FlyerCard lang={lang} park={parkData} config={config} flyerRef={flyerRef} />
                <button onClick={handleDownload} disabled={downloading} style={{ width: "100%", maxWidth: 300, padding: "14px 0", borderRadius: 20, border: "none", cursor: downloading ? "default" : "pointer", background: downloading ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, boxShadow: downloading ? "none" : "0 6px 24px rgba(37,99,235,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {downloading ? (
                    <><svg style={{ animation: "camila-spin 1s linear infinite" }} width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" /></svg>{tr.downloading}</>
                  ) : tr.download}
                </button>
                {parkData && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#eff6ff", borderRadius: 20, padding: "6px 14px", border: "1.5px solid #bfdbfe" }}>
                    <span>{parkData.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1e40af" }}>{parkData.names[lang]}</span>
                    <button onClick={() => setSelectedPark(null)} style={{ marginLeft: 2, fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                  </div>
                )}
                <div style={{ width: "100%", maxWidth: 300, background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0f9ff" }}>
                    <span style={{ fontFamily: "Caveat,cursive", fontSize: 17, fontWeight: 700, color: "#1e3a8a" }}>📋 {tr.rulesTitle}</span>
                  </div>
                  {tr.rules.map(([icon, text], i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: i < tr.rules.length - 1 ? "1px solid #f0f9ff" : "none" }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: "100%", maxWidth: 300, background: "linear-gradient(135deg,#faf5ff,#eff6ff)", borderRadius: 14, border: "1px solid #e9d5ff", padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📸</div>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{tr.contactSub}</div>
                    <a href={`https://instagram.com/${config.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 16, textDecoration: "none" }}>{config.instagram}</a>
                  </div>
                </div>
              </div>
            )}
            {tab === "edit" && <EditPanel lang={lang} config={config} setConfig={setConfig} parks={parks} setParks={setParks} meetingPoints={meetingPoints} setMeetingPoints={setMeetingPoints} />}
            {tab === "map" && <MapPanel lang={lang} parks={parks} meetingPoints={meetingPoints} selectedPark={selectedPark} onSelect={setSelectedPark} sessions={sessions} />}
            {tab === "roi" && <ROIPanel lang={lang} selectedPark={selectedPark} parks={parks} sessions={sessions} setSessions={setSessions} addHistorial={addHistorial} />}
            {tab === "apoyo" && <ApoyoPanel lang={lang} totalPoints={totalPoints} addHistorial={addHistorial} tasks={tasks} setTasks={setTasks} />}
            {tab === "historial" && <HistorialPanel lang={lang} entries={historial} setEntries={setHistorial} totalPoints={totalPoints} />}
          </div>
        </div>

        {!isDesktop && (
          <div style={{ background: "rgba(255,255,255,.96)", backdropFilter: "blur(12px)", borderTop: "1px solid #e0eaff", flexShrink: 0 }}>
            <div style={{ display: "flex", overflowX: "auto", padding: "6px 6px 10px", gap: 0, scrollbarWidth: "none" as const }}>
              {TABS.map(({ id, icon }) => <NavItem key={id} id={id} icon={icon} />)}
            </div>
          </div>
        )}
      </div>

      {showHelpModal && (
        <div onClick={() => setShowHelpModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, padding: 28, maxWidth: 320, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#16a34a,#15803d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 14px" }}>👨‍💻</div>
            <div style={{ fontFamily: "Caveat,cursive", fontSize: 26, fontWeight: 700, color: "#1e3a8a", marginBottom: 4 }}>Rodrigo</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 18, lineHeight: 1.5 }}>{lang === "es" ? "¿Necesitas ayuda técnica?" : lang === "en" ? "Need technical help?" : "Precisa de ajuda técnica?"}</div>
            <div style={{ fontFamily: "Caveat,cursive", fontSize: 22, fontWeight: 700, color: "#16a34a", marginBottom: 22, padding: "10px 16px", background: "#f0fdf4", borderRadius: 12, border: "1.5px solid #bbf7d0" }}>📞 +56 9 4263 7408</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setShowHelpModal(false)} style={{ padding: "12px", borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#f9fafb", color: "#6b7280", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Cancelar</button>
              <a href="tel:+56942637408" onClick={() => setShowHelpModal(false)} style={{ padding: "12px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "Nunito,sans-serif", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>📞 {lang === "en" ? "Call" : "Llamar"}</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
