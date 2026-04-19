import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { getActiveTasks, MONTHS, TODAY_M } from "../data/garden";
import { TaskRow } from "./TodayPage";

const ZONE_TABS = ["Seeds", "Today", "Tasks", "Diary", "Calendar"];

export default function ZoneDetailPage() {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { getZone, getSeedsByZone, toggleTask, isTaskDone,
    loadZoneTasks, addZoneTask, toggleZoneTask, deleteZoneTask, getZoneTasks,
    loadZoneDiary, addZoneDiaryEntry, deleteZoneDiaryEntry, getZoneDiaryEntries,
    loadDiaryEntries, getDiaryEntries,
  } = useSeedsContext();
  const [activeTab, setActiveTab] = useState(0);
  const zone = getZone(zoneId);
  const seeds = zone ? getSeedsByZone(zoneId) : [];

  useEffect(() => {
    if (!zoneId) return;
    loadZoneTasks(zoneId);
    loadZoneDiary(zoneId);
  }, [zoneId]);

  if (!zone) {
    return (
      <div className="page" style={{ textAlign: "center", padding: "var(--space-2xl) 0" }}>
        <p style={{ color: "var(--color-text-muted)" }}>Zone not found.</p>
        <button className="btn-secondary" onClick={() => navigate("/garden")} style={{ marginTop: "var(--space-md)" }}>
          Back to Garden
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Back */}
      <button
        className="btn-ghost"
        onClick={() => navigate("/garden")}
        style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)", marginBottom: "var(--space-lg)" }}
      >
        ← Garden
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-xl)" }}>
        <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>{zone.emoji}</span>
        <div>
          <h1 style={{ marginBottom: "2px" }}>{zone.name}</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", margin: 0 }}>
            {zone.description} · {seeds.length} plant{seeds.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1.5px solid var(--color-border)",
        marginBottom: "var(--space-xl)",
      }}>
        {ZONE_TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === i ? `3px solid ${zone.borderColor}` : "3px solid transparent",
              color: activeTab === i ? zone.borderColor : "var(--color-text-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-small)",
              fontWeight: 600,
              padding: "var(--space-sm) var(--space-md)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              minHeight: "auto",
              marginBottom: "-1.5px",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && <SeedsTab seeds={seeds} zone={zone} navigate={navigate} />}
      {activeTab === 1 && <TodayTab seeds={seeds} toggleTask={toggleTask} isTaskDone={isTaskDone} navigate={navigate} />}
      {activeTab === 2 && <ZoneTasksTab zoneId={zoneId} zone={zone} seeds={seeds} getZoneTasks={getZoneTasks} addZoneTask={addZoneTask} toggleZoneTask={toggleZoneTask} deleteZoneTask={deleteZoneTask} toggleTask={toggleTask} isTaskDone={isTaskDone} navigate={navigate} />}
      {activeTab === 3 && <ZoneDiaryTab zoneId={zoneId} zone={zone} seeds={seeds} getZoneDiaryEntries={getZoneDiaryEntries} addZoneDiaryEntry={addZoneDiaryEntry} deleteZoneDiaryEntry={deleteZoneDiaryEntry} loadDiaryEntries={loadDiaryEntries} getDiaryEntries={getDiaryEntries} />}
      {activeTab === 4 && <CalendarTab seeds={seeds} />}
    </div>
  );
}

// ─── Seeds Tab ────────────────────────────────────────────────────────────────

function SeedsTab({ seeds, zone, navigate }) {
  if (seeds.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>{zone.emoji}</div>
        <p>No plants assigned to {zone.name} yet.</p>
        <p style={{ fontSize: "var(--text-small)", marginTop: "var(--space-sm)" }}>
          Assign seeds from the Seeds page or when uploading.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      {seeds.map(seed => (
        <div
          key={seed.id}
          className="card"
          onClick={() => navigate(`/seeds/${seed.id}`)}
          style={{ cursor: "pointer", display: "flex", gap: "var(--space-md)", alignItems: "center" }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
        >
          <span style={{ fontSize: "2rem", lineHeight: 1, flexShrink: 0 }}>{seed.emoji || "🌱"}</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: "2px" }}>{seed.name}</h3>
            {seed.variety && seed.variety !== "Standard" && (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--color-green)", fontSize: "var(--text-small)", margin: 0 }}>
                '{seed.variety}'
              </p>
            )}
          </div>
          <span style={{ fontSize: "var(--text-nav)", color: "var(--color-text-muted)" }}>→</span>
        </div>
      ))}
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab({ seeds, toggleTask, isTaskDone, navigate }) {
  const allTasks = seeds.flatMap(seed =>
    getActiveTasks(seed)
      .map(task => ({ seed, task }))
  );
  const pending = allTasks.filter(({ seed, task }) => !isTaskDone(seed.id, task.type));
  const done    = allTasks.filter(({ seed, task }) =>  isTaskDone(seed.id, task.type));

  if (allTasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
        <p>No tasks for this zone right now.</p>
      </div>
    );
  }

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: "var(--color-green)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "var(--space-md)" }}>
            To do
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {pending.map(({ seed, task }) => (
              <TaskRow
                key={`${seed.id}-${task.type}`}
                seed={seed}
                task={task}
                done={false}
                onToggle={() => toggleTask(seed.id, task.type)}
                onNavigate={() => navigate(`/seeds/${seed.id}`)}
              />
            ))}
          </div>
        </div>
      )}
      {done.length > 0 && (
        <div>
          <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "var(--space-md)" }}>
            Done ({done.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {done.map(({ seed, task }) => (
              <TaskRow
                key={`${seed.id}-${task.type}`}
                seed={seed}
                task={task}
                done={true}
                onToggle={() => toggleTask(seed.id, task.type)}
                onNavigate={() => navigate(`/seeds/${seed.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Zone Tasks Tab ───────────────────────────────────────────────────────────

function ZoneTasksTab({ zoneId, zone, seeds, getZoneTasks, addZoneTask, toggleZoneTask, deleteZoneTask, toggleTask, isTaskDone, navigate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const zoneTasks = getZoneTasks(zoneId);
  const plantTasks = seeds.flatMap(seed => getActiveTasks(seed).map(task => ({ seed, task })));

  async function handleAdd() {
    if (!title.trim()) return;
    setSaving(true);
    await addZoneTask(zoneId, { title: title.trim(), description: description.trim(), dueDate: dueDate || null });
    setTitle(""); setDescription(""); setDueDate(""); setShowForm(false); setSaving(false);
  }

  return (
    <div>
      {/* Zone-wide tasks */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
        <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Zone Tasks</div>
        <button className="btn-ghost" onClick={() => setShowForm(v => !v)} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)" }}>
          {showForm ? "Cancel" : "+ Add task"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title (e.g. Weed the beds)" style={{ marginBottom: "var(--space-sm)" }} autoFocus />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} style={{ marginBottom: "var(--space-sm)", resize: "vertical" }} />
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ marginBottom: "var(--space-md)" }} />
          <button className="btn-primary" onClick={handleAdd} disabled={!title.trim() || saving} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-lg)" }}>
            {saving ? "Saving…" : "Save task"}
          </button>
        </div>
      )}

      {zoneTasks.length === 0 && !showForm ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", marginBottom: "var(--space-xl)" }}>No zone tasks yet. Add tasks like weeding, mulching, or watering the whole zone.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginBottom: "var(--space-xl)" }}>
          {zoneTasks.map(task => (
            <div key={task.id} className="card" style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)", opacity: task.completed ? 0.6 : 1 }}>
              <input type="checkbox" checked={task.completed} onChange={() => toggleZoneTask(zoneId, task.id)} style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, cursor: "pointer" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--text-body)", textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</div>
                {task.description && <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 2 }}>{task.description}</div>}
                {task.dueDate && <div style={{ fontSize: "var(--text-nav)", color: zone.borderColor, marginTop: 4, fontWeight: 600 }}>Due: {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>}
              </div>
              <button onClick={() => deleteZoneTask(zoneId, task.id)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: 4, minHeight: "auto" }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Plant tasks read-only */}
      {plantTasks.length > 0 && (
        <>
          <div style={{ fontSize: "var(--text-nav)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-md)" }}>Plant Tasks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {plantTasks.map(({ seed, task }) => (
              <TaskRow key={`${seed.id}-${task.type}`} seed={seed} task={task} done={isTaskDone(seed.id, task.type)} onToggle={() => toggleTask(seed.id, task.type)} onNavigate={() => navigate(`/seeds/${seed.id}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Zone Diary Tab ───────────────────────────────────────────────────────────

function ZoneDiaryTab({ zoneId, zone, seeds, getZoneDiaryEntries, addZoneDiaryEntry, deleteZoneDiaryEntry, loadDiaryEntries, getDiaryEntries }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const zoneEntries = getZoneDiaryEntries(zoneId);

  useEffect(() => {
    seeds.forEach(s => loadDiaryEntries(s.id));
  }, [seeds.length]);

  const plantEntries = seeds.flatMap(seed =>
    getDiaryEntries(seed.id).map(e => ({ ...e, sourceName: seed.name, sourceEmoji: seed.emoji || "🌱", isPlant: true }))
  );

  const allEntries = [
    ...zoneEntries.map(e => ({ ...e, sourceName: zone.name, sourceEmoji: zone.emoji, isPlant: false })),
    ...plantEntries,
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    await addZoneDiaryEntry(zoneId, { text: text.trim(), photo: null });
    setText(""); setSaving(false);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: "var(--space-xl)" }}>
        <h3 style={{ marginBottom: "var(--space-md)" }}>Add a zone note</h3>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What's happening in this zone today?" rows={3} style={{ marginBottom: "var(--space-md)", resize: "vertical" }} />
        <button className="btn-primary" onClick={handleSave} disabled={!text.trim() || saving} style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-lg)" }}>
          {saving ? "Saving…" : "Save entry"}
        </button>
      </div>

      {allEntries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
          <p>No diary entries yet for this zone or its plants.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {allEntries.map(entry => (
            <div key={`${entry.isPlant ? "p" : "z"}-${entry.id}`} className="card" style={{ borderLeft: `3px solid ${entry.isPlant ? "var(--color-border)" : zone.borderColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-sm)" }}>
                <div>
                  <span style={{ fontSize: "var(--text-nav)", fontWeight: 600, color: "var(--color-text-muted)" }}>
                    {new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span style={{ fontSize: "var(--text-nav)", color: entry.isPlant ? "var(--color-text-muted)" : zone.borderColor, marginLeft: "var(--space-sm)", fontWeight: 600 }}>
                    {entry.sourceEmoji} {entry.sourceName}
                  </span>
                </div>
                {!entry.isPlant && (
                  <button onClick={() => deleteZoneDiaryEntry(zoneId, entry.id)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: 4, minHeight: "auto" }}>×</button>
                )}
              </div>
              <p style={{ fontSize: "var(--text-body)", lineHeight: 1.7, margin: 0 }}>{entry.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab({ seeds }) {
  if (seeds.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
        <p>No plants in this zone to show on the calendar.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 560 }}>
        {/* Month headers */}
        <div style={{ display: "grid", gridTemplateColumns: "140px repeat(12, 1fr)", gap: 4, marginBottom: "var(--space-sm)" }}>
          <div />
          {MONTHS.map((m, i) => (
            <div key={m} style={{
              textAlign: "center",
              fontSize: "var(--text-nav)",
              fontWeight: 700,
              color: i + 1 === TODAY_M ? "var(--color-green)" : "var(--color-text-muted)",
              borderBottom: i + 1 === TODAY_M ? "2px solid var(--color-green)" : "2px solid transparent",
              paddingBottom: 4,
            }}>
              {m[0]}
            </div>
          ))}
        </div>

        {seeds.map(seed => (
          <div key={seed.id} style={{ display: "grid", gridTemplateColumns: "140px repeat(12, 1fr)", gap: 4, marginBottom: 4, alignItems: "center" }}>
            <div style={{ fontSize: "var(--text-small)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "var(--space-sm)", fontWeight: 500 }}>
              {seed.emoji} {seed.name}
            </div>
            {MONTHS.map((_, i) => {
              const m = i + 1;
              const sow = seed.sowMonths?.includes(m);
              const tx  = seed.transplantMonths?.includes(m);
              const hv  = seed.harvestMonths?.includes(m);
              const now = m === TODAY_M;
              let bg = "var(--color-border)"; let label = "";
              if (sow && hv) { bg = "linear-gradient(135deg, var(--color-green), #b45309)"; label = "S/H"; }
              else if (sow) { bg = "var(--color-green)"; label = "S"; }
              else if (tx)  { bg = "#1d4ed8"; label = "T"; }
              else if (hv)  { bg = "#b45309"; label = "H"; }
              return (
                <div key={m} style={{ height: 26, background: bg, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: (sow || tx || hv) ? "#fff" : "transparent", border: now ? "2px solid var(--color-green)" : "2px solid transparent" }}>
                  {label}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
