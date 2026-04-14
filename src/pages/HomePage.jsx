import { useNavigate } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { LOC, getActiveTasks } from "../data/garden";
import { TaskRow } from "./TodayPage";

export default function HomePage({ onUpload }) {
  const { seeds, toggleTask, isTaskDone } = useSeedsContext();
  const navigate = useNavigate();

  // Flat list of pending tasks for the widget (max 3 shown)
  const allPending = seeds.flatMap(seed =>
    getActiveTasks(seed)
      .filter(task => !isTaskDone(seed.id, task.type))
      .map(task => ({ seed, task }))
  );
  const todayPreview = allPending.slice(0, 3);

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

      {/* Garden summary */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h3 style={{ marginBottom: "var(--space-md)" }}>Your Garden</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-md)",
        }}>
          {[
            ["Location", LOC.name],
            ["Zone", LOC.zone],
            ["Season", LOC.season],
            ["Plot", LOC.plot],
            ["Last frost", LOC.lastFrost],
            ["First frost", LOC.firstFrost],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{
                fontSize: "var(--text-nav)",
                fontWeight: 600,
                color: "var(--color-text-muted)",
                marginBottom: "2px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {label}
              </div>
              <div style={{
                fontSize: "var(--text-body)",
                color: "var(--color-text)",
                fontWeight: 500,
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today widget */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-md)",
        }}>
          <h3>Today</h3>
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
