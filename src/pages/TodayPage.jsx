import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { getActiveTasks } from "../data/garden";

const TODAY_LABEL = new Date().toLocaleDateString("en-GB", {
  day: "numeric", month: "long", year: "numeric",
});

export default function TodayPage() {
  const { seeds, toggleTask, isTaskDone } = useSeedsContext();
  const navigate = useNavigate();

  // Build flat list of all actionable tasks across seeds
  const allTaskItems = seeds.flatMap(seed =>
    getActiveTasks(seed).map(task => ({ seed, task }))
  );

  const pending  = allTaskItems.filter(({ seed, task }) => !isTaskDone(seed.id, task.type));
  const done     = allTaskItems.filter(({ seed, task }) =>  isTaskDone(seed.id, task.type));
  const overdue  = pending.filter(({ task }) => task.status === "overdue");
  const current  = pending.filter(({ task }) => task.status === "current");

  return (
    <div className="page">
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ marginBottom: "var(--space-xs)" }}>{TODAY_LABEL}</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
          Your prioritised action list
        </p>
      </div>

      {seeds.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-2xl) 0", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>📋</div>
          <p>Add seeds to see your daily tasks.</p>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <SectionHeader label="Overdue" color="var(--color-error)" />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {overdue.map(({ seed, task }) => (
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
        </section>
      )}

      {/* Act now */}
      {current.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <SectionHeader label="Act now" color="var(--color-green)" />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {current.map(({ seed, task }) => (
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
        </section>
      )}

      {/* Done */}
      {done.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <SectionHeader label={`Done (${done.length})`} color="var(--color-text-muted)" />
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

// ─── Shared components ────────────────────────────────────────────────────────

function SectionHeader({ label, color }) {
  return (
    <div style={{
      fontSize: "var(--text-nav)",
      fontWeight: 700,
      color,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginBottom: "var(--space-md)",
    }}>
      {label}
    </div>
  );
}

export function TaskRow({ seed, task, done, onToggle, onNavigate }) {
  const [animating, setAnimating] = useState(false);

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
        opacity: animating ? 0 : done ? 0.5 : 1,
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
                color: animating ? "rgba(255,255,255,0.8)" : "var(--color-green)",
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

        {!done && !animating && seed.immediateNextStep && task.status === "current" && (
          <p style={{
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
            margin: "var(--space-xs) 0 0",
          }}>
            {seed.immediateNextStep}
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
