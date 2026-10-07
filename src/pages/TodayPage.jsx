import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { getActiveTasks, taskGuidance, groupByZone, PROBABLY_DONE_AFTER_DAYS } from "../data/garden";

const TODAY_LABEL = new Date().toLocaleDateString("en-GB", {
  day: "numeric", month: "long", year: "numeric",
});

export default function TodayPage() {
  const { seeds, zones, toggleTask, isTaskDone, markTasksDone } = useSeedsContext();
  const navigate = useNavigate();
  const [showDone, setShowDone] = useState(false);

  const allTaskItems = seeds.flatMap(seed => getActiveTasks(seed).map(task => ({ seed, task })));
  const pending = allTaskItems.filter(({ seed, task }) => !isTaskDone(seed.id, task.type));
  const done    = allTaskItems.filter(({ seed, task }) =>  isTaskDone(seed.id, task.type));
  const current = pending.filter(({ task }) => task.status === "current");
  const overdue = pending.filter(({ task }) => task.status === "overdue" && task.daysOverdue <= PROBABLY_DONE_AFTER_DAYS);
  const stale   = pending.filter(({ task }) => task.status === "overdue" && task.daysOverdue > PROBABLY_DONE_AFTER_DAYS);

  const row = ({ seed, task }, isDone = false) => (
    <TaskRow
      key={`${seed.id}-${task.type}`}
      seed={seed}
      task={task}
      done={isDone}
      onToggle={() => toggleTask(seed.id, task.type)}
      onNavigate={() => navigate(`/seeds/${seed.id}`)}
    />
  );

  return (
    <div className="page">
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ marginBottom: "var(--space-xs)" }}>{TODAY_LABEL}</h1>
        {seeds.length > 0 && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
            {summary(current.length, overdue.length, stale.length)}
          </p>
        )}
      </div>

      {seeds.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>📋</div>
          <p>Add plants to see your daily tasks.</p>
        </div>
      )}

      {current.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <SectionHeader label="To do now" color="var(--color-green)" />
          {groupByZone(current, zones).map(g => (
            <ZoneGroup key={g.zone?.id ?? "none"} zone={g.zone} count={g.items.length}>
              {g.items.map(item => row(item))}
            </ZoneGroup>
          ))}
        </section>
      )}

      {overdue.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <SectionHeader label="Overdue" color="var(--color-error)" />
          {groupByZone(overdue, zones).map(g => (
            <ZoneGroup key={g.zone?.id ?? "none"} zone={g.zone} count={g.items.length}>
              {g.items.map(item => row(item))}
            </ZoneGroup>
          ))}
        </section>
      )}

      {stale.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <SectionHeader label="Probably already done" color="var(--color-text-muted)" />
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", margin: "0 0 var(--space-md)" }}>
            These windows ended more than {PROBABLY_DONE_AFTER_DAYS} days ago. If you did them, clear an area in one go.
          </p>
          {groupByZone(stale, zones).map(g => (
            <StaleGroup
              key={g.zone?.id ?? "none"}
              zone={g.zone}
              items={g.items}
              onMarkAllDone={() => markTasksDone(g.items.map(({ seed, task }) => ({ seedId: seed.id, taskType: task.type })))}
              renderRow={item => row(item)}
            />
          ))}
        </section>
      )}

      {done.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <h2 className="section-label" style={{ color: "var(--color-text-muted)" }}>
            <button type="button" className="disclosure disclosure--heading" aria-expanded={showDone} aria-controls="done-tasks" onClick={() => setShowDone(v => !v)}>
              Done ({done.length})
            </button>
          </h2>
          {showDone && (
            <div id="done-tasks" className="task-list">
              {done.map(item => row(item, true))}
            </div>
          )}
        </section>
      )}

      {seeds.length > 0 && pending.length === 0 && done.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>✓</div>
          <p>Nothing urgent today. Check the Calendar for upcoming tasks.</p>
        </div>
      )}

      {seeds.length > 0 && pending.length === 0 && done.length > 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-lg) 0", color: "var(--color-green)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-sm)" }}>🌱</div>
          <p style={{ fontWeight: 600 }}>All done for today!</p>
        </div>
      )}
    </div>
  );
}

function summary(now, overdue, stale) {
  const parts = [];
  if (now) parts.push(`${now} to do now`);
  if (overdue) parts.push(`${overdue} overdue`);
  if (stale) parts.push(`${stale} probably already done`);
  return parts.length ? parts.join(" · ") : "Nothing to do right now";
}

function zoneName(zone) {
  return zone ? `${zone.emoji ? `${zone.emoji} ` : ""}${zone.name}` : "No zone";
}

// One area's tasks under a small heading with a count
function ZoneGroup({ zone, count, children }) {
  return (
    <div className="zone-group">
      <h3 className="zone-group__title">
        <span>{zoneName(zone)}</span>
        <span className="zone-group__count">{count}</span>
      </h3>
      <div className="task-list">{children}</div>
    </div>
  );
}

// A collapsed bundle of old tasks for one area, cleared with one button
function StaleGroup({ zone, items, onMarkAllDone, renderRow }) {
  const [open, setOpen] = useState(false);
  const listId = `stale-${zone?.id ?? "none"}`;
  return (
    <div className="stale-group">
      <div className="stale-group__bar">
        <button type="button" className="disclosure stale-group__toggle" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(v => !v)}>
          {zoneName(zone)} · {items.length} task{items.length !== 1 ? "s" : ""}
        </button>
        <button type="button" className="btn-secondary stale-group__clear" onClick={onMarkAllDone}>
          Mark all done
        </button>
      </div>
      {open && <div id={listId} className="task-list" style={{ marginTop: "var(--space-sm)" }}>{items.map(renderRow)}</div>}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function SectionHeader({ label, color }) {
  return <h2 className="section-label" style={{ color }}>{label}</h2>;
}

export function TaskRow({ seed, task, done, onToggle, onNavigate }) {
  const [animating, setAnimating] = useState(false);
  const guidance = taskGuidance(seed, task.type);

  function handleCheck(e) {
    e.stopPropagation();
    if (done) {
      // Uncheck immediately — no animation needed
      onToggle();
      return;
    }
    // Mark done: flash green, fade out, then commit
    setAnimating(true);
    setTimeout(() => onToggle(), 2800);
  }

  return (
    <div
      className="card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-md) var(--space-lg)",
        borderLeft: done
          ? "4px solid var(--color-border)"
          : animating
          ? "4px solid var(--color-green)"
          : `4px solid ${task.color}`,
        background: animating ? "var(--color-green)" : done ? "var(--color-bg)" : "var(--color-bg)",
        opacity: animating ? 0 : 1,
        // Green flash instant, then fade out after 250ms
        transition: animating
          ? "background 0.25s ease, border-color 0.25s ease, opacity 1s ease 0.9s"
          : "opacity 0.2s ease",
        pointerEvents: animating ? "none" : "auto",
      }}
    >
      {/* Seed info — clickable to navigate */}
      <div
        style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
        onClick={!animating ? onNavigate : undefined}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{seed.emoji || "🌱"}</span>
          <span style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-body)",
            fontWeight: 600,
            textDecoration: done ? "line-through" : "none",
            color: animating ? "#fff" : done ? "var(--color-text-muted)" : "var(--color-text)",
          }}>
            {seed.name}
            {seed.variety && seed.variety !== "Standard" && (
              <span style={{
                fontStyle: "italic",
                fontWeight: 400,
                marginLeft: "var(--space-xs)",
                color: animating ? "rgba(255,255,255,0.8)" : done ? "var(--color-text-muted)" : "var(--color-green)",
              }}>
                '{seed.variety}'
              </span>
            )}
          </span>
          <span style={{
            fontSize: "var(--text-nav)",
            fontWeight: 700,
            color: animating ? "#fff" : done ? "var(--color-text-muted)" : task.color,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            {task.label}
          </span>
        </div>

        {!done && !animating && guidance && task.status === "current" && (
          <p className="clamp-2" title={guidance} style={{
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
            margin: "var(--space-xs) 0 0",
          }}>
            {guidance}
          </p>
        )}
      </div>

      {/* Checkbox — right side */}
      <button
        onClick={handleCheck}
        aria-label={done ? "Mark undone" : "Mark done"}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: animating || done ? "2px solid transparent" : `2px solid ${task.color}`,
          background: animating || done ? "var(--color-green)" : "transparent",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "16px",
          minHeight: "auto",
          padding: 0,
          transition: "all 0.15s ease",
        }}
      >
        {(animating || done) ? "✓" : ""}
      </button>
    </div>
  );
}
