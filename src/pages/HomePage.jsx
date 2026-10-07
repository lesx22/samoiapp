import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { LOC, GARDEN_FACTS, KEY_FACT_COUNT, NORMANDY_NOTES, getActiveTasks } from "../data/garden";
import { TaskRow } from "./TodayPage";

export default function HomePage({ onUpload }) {
  const { seeds, toggleTask, isTaskDone } = useSeedsContext();
  const navigate = useNavigate();
  const [showAllFacts, setShowAllFacts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Flat list of pending tasks for the widget (max 3 shown)
  const allPending = seeds.flatMap(seed =>
    getActiveTasks(seed)
      .filter(task => !isTaskDone(seed.id, task.type))
      .map(task => ({ seed, task }))
  );
  const todayPreview = allPending.slice(0, 3);
  const facts = showAllFacts ? GARDEN_FACTS : GARDEN_FACTS.slice(0, KEY_FACT_COUNT);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ marginBottom: "var(--space-xs)" }}>
          Jardin<span style={{ color: "var(--color-green)", fontStyle: "italic" }}>·</span>Planner
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
          Your growing plan for {LOC.name}
        </p>
      </div>

      {/* Today widget: the most useful thing, so it comes first */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-md)",
        }}>
          <h2 className="h3">Today</h2>
          <button
            className="btn-ghost"
            onClick={() => navigate("/today")}
            style={{ fontSize: "var(--text-small)", minHeight: "auto", padding: "var(--space-xs) var(--space-md)" }}
          >
            See all
          </button>
        </div>

        {seeds.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
            Add plants to see your daily tasks.
          </p>
        )}

        {seeds.length > 0 && allPending.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
            Nothing urgent today. Check the Calendar for upcoming tasks.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {todayPreview.map(({ seed, task }) => (
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

        {allPending.length > 3 && (
          <p style={{
            marginTop: "var(--space-sm)",
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted)",
          }}>
            +{allPending.length - 3} more tasks today
          </p>
        )}
      </div>

      {/* Garden profile: key facts, the rest behind "More" */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="h3" style={{ marginBottom: "var(--space-md)" }}>Your garden</h2>
        <dl id="garden-facts" className="fact-grid">
          {facts.map(({ key, label }) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{LOC[key]}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          className="disclosure"
          aria-expanded={showAllFacts}
          aria-controls="garden-facts"
          onClick={() => setShowAllFacts(v => !v)}
        >
          {showAllFacts ? "Less" : "More about your garden"}
        </button>
      </div>

      {/* Normandy growing notes, collapsed by default */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="h3" style={{ margin: 0 }}>
          <button
            type="button"
            className="disclosure disclosure--heading"
            aria-expanded={showNotes}
            aria-controls="normandy-notes"
            onClick={() => setShowNotes(v => !v)}
          >
            Normandy growing notes
          </button>
        </h2>
        {showNotes && (
          <ul id="normandy-notes" className="check-list">
            {NORMANDY_NOTES.map(note => <li key={note}>{note}</li>)}
          </ul>
        )}
      </div>

      {/* Upload CTA */}
      <div style={{ textAlign: "center", padding: "var(--space-xl) 0" }}>
        {seeds.length === 0 ? (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>🌱</div>
            <h2 style={{ marginBottom: "var(--space-sm)" }}>Start your garden</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
              Add your first plants to get a personalised growing plan.
            </p>
          </>
        ) : (
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
            {seeds.length} plant{seeds.length !== 1 ? "s" : ""} in your collection
          </p>
        )}
        <button
          className="btn-primary"
          onClick={onUpload}
        >
          + Add Plants
        </button>
      </div>
    </div>
  );
}
