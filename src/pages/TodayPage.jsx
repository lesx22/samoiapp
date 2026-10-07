import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { getActiveTasks, taskGuidance, groupByZone, PROBABLY_DONE_AFTER_DAYS } from "../data/garden";
import { EMPTY_TASK_FILTERS, NO_ZONE, TASK_TYPES, filterTasks } from "../lib/taskFilters";
import { activeFilters } from "../lib/plantFilters";
import { Button, Card, SearchInput, Chip, Sheet, OptionGroup, Tag, Icon, useHideOnScroll } from "../ui";

const DATE_LABEL = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

// Each area shows this many tasks before "Show more"
const GROUP_PREVIEW = 5;

const TYPE_TONE = { sow: "green", harvest: "warn" };
const TYPE_LABEL = Object.fromEntries(TASK_TYPES.map(t => [t.value, t.label]));

export default function TodayPage() {
  const { seeds, zones, toggleTask, isTaskDone, markTasksDone } = useSeedsContext();
  const toolbarHidden = useHideOnScroll();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_TASK_FILTERS);
  const [draft, setDraft] = useState(EMPTY_TASK_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const allItems = useMemo(() => seeds.flatMap(seed => getActiveTasks(seed).map(task => ({ seed, task }))), [seeds]);
  const items = filterTasks(allItems, search, filters);
  const pending = items.filter(({ seed, task }) => !isTaskDone(seed.id, task.type));
  const done    = items.filter(({ seed, task }) =>  isTaskDone(seed.id, task.type));
  const current = pending.filter(({ task }) => task.status === "current");
  const overdue = pending.filter(({ task }) => task.status === "overdue" && task.daysOverdue <= PROBABLY_DONE_AFTER_DAYS);
  const stale   = pending.filter(({ task }) => task.status === "overdue" && task.daysOverdue > PROBABLY_DONE_AFTER_DAYS);

  const applied = activeFilters(filters);
  const narrowed = applied.length > 0 || search.trim() !== "";
  const zoneLabel = id => id === NO_ZONE ? "No zone" : zones.find(z => z.id === id)?.name ?? id;
  const chipLabel = (key, value) => key === "zone" ? zoneLabel(value) : TYPE_LABEL[value];

  const markAll = list => markTasksDone(list.map(({ seed, task }) => ({ seedId: seed.id, taskType: task.type })));

  const row = ({ seed, task }, isDone = false) => (
    <li key={`${seed.id}-${task.type}`}>
      <TaskRow seed={seed} task={task} done={isDone} onToggle={() => toggleTask(seed.id, task.type)} />
    </li>
  );

  return (
    <div className="ui-page">
      <div className="ui-page-header">
        <div>
          <h1 className="ui-display">Today</h1>
          <p className="ui-small">
            {DATE_LABEL()}
            {seeds.length > 0 && ` · ${summary(current.length, overdue.length, stale.length)}`}
          </p>
        </div>
      </div>

      {seeds.length > 0 && (
        <div className={`ui-toolbar${toolbarHidden ? " ui-toolbar--hidden" : ""}`}>
          <div className="ui-toolbar__grid">
            <div className="ui-toolbar__search">
              <SearchInput label="Search tasks" placeholder="Search plants" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="secondary" icon="filter" className="ui-toolbar__filter" aria-haspopup="dialog"
              onClick={() => { setDraft(filters); setSheetOpen(true); }}>
              Filter
              {applied.length > 0 && <span className="ui-tag ui-tag--green" aria-label={`${applied.length} on`}>{applied.length}</span>}
            </Button>
            {applied.length > 0 && (
              <div className="ui-row ui-toolbar__chips">
                {applied.map(([key, value]) => (
                  <Chip key={key} onRemove={() => setFilters(f => ({ ...f, [key]: "" }))}>{chipLabel(key, value)}</Chip>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {seeds.length === 0 && (
        <EmptyCard>Add plants to see your daily tasks.</EmptyCard>
      )}

      <div className="ui-stack" style={{ gap: "var(--space-8)" }}>
        {current.length > 0 && (
          <TaskSection title="To do now" count={current.length}>
            {groupByZone(current, zones).map(g => (
              <ZoneGroup key={g.zone?.id ?? "none"} zone={g.zone} items={g.items} renderRow={row} onMarkAllDone={() => markAll(g.items)} />
            ))}
          </TaskSection>
        )}

        {overdue.length > 0 && (
          <TaskSection title="Overdue" count={overdue.length} tone="error"
            note={`Windows that ended in the last ${PROBABLY_DONE_AFTER_DAYS} days.`}>
            {groupByZone(overdue, zones).map(g => (
              <ZoneGroup key={g.zone?.id ?? "none"} zone={g.zone} items={g.items} renderRow={row} onMarkAllDone={() => markAll(g.items)} />
            ))}
          </TaskSection>
        )}

        {stale.length > 0 && (
          <TaskSection title="Probably already done" count={stale.length}
            note={`These windows ended more than ${PROBABLY_DONE_AFTER_DAYS} days ago. If you did them, clear an area in one go.`}>
            {groupByZone(stale, zones).map(g => (
              <StaleGroup
                key={g.zone?.id ?? "none"}
                zone={g.zone}
                items={g.items}
                onMarkAllDone={() => markAll(g.items)}
                renderRow={row}
              />
            ))}
          </TaskSection>
        )}

        {done.length > 0 && (
          <section className="ui-stack" style={{ gap: "var(--space-3)" }}>
            <h2 className="ui-title">
              <button type="button" className="ui-disclosure" aria-expanded={showDone} aria-controls="done-tasks" onClick={() => setShowDone(v => !v)}>
                Done <span className="ui-count">{done.length}</span>
                <Icon name="chevronDown" width="16" height="16" />
              </button>
            </h2>
            {showDone && (
              <Card variant="flush" id="done-tasks">
                <ul className="ui-list">{done.map(item => row(item, true))}</ul>
              </Card>
            )}
          </section>
        )}
      </div>

      {seeds.length > 0 && pending.length === 0 && (
        narrowed
          ? <EmptyCard>No tasks match your search and filters.
              <Button variant="secondary" onClick={() => { setSearch(""); setFilters(EMPTY_TASK_FILTERS); }}>Clear search and filters</Button>
            </EmptyCard>
          : <EmptyCard>{done.length > 0 ? "All done for today." : "Nothing urgent today. Check the Calendar for upcoming tasks."}</EmptyCard>
      )}

      <TaskFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        zones={zones}
        hasNoZone={allItems.some(i => !i.seed.zoneId)}
        draft={draft}
        setDraft={setDraft}
        count={filterTasks(allItems, search, draft).filter(({ seed, task }) => !isTaskDone(seed.id, task.type)).length}
        onApply={() => { setFilters(draft); setSheetOpen(false); }}
      />
    </div>
  );
}

function summary(now, overdue, stale) {
  const parts = [];
  if (now) parts.push(`${now} to do now`);
  if (overdue) parts.push(`${overdue} overdue`);
  if (stale) parts.push(`${stale} probably already done`);
  return parts.length ? parts.join(" · ") : "nothing to do right now";
}

function zoneName(zone) {
  return zone ? `${zone.emoji ? `${zone.emoji} ` : ""}${zone.name}` : "No zone";
}

function EmptyCard({ children }) {
  return (
    <Card variant="muted" className="ui-stack" style={{ alignItems: "center", textAlign: "center", padding: "var(--space-10) var(--space-6)" }}>
      {children}
    </Card>
  );
}

function TaskSection({ title, count, tone, note, children }) {
  return (
    <section className="ui-stack" style={{ gap: "var(--space-3)" }}>
      <div>
        <h2 className="ui-title" style={tone === "error" ? { color: "var(--color-error)" } : undefined}>
          {title} <span className="ui-count">{count}</span>
        </h2>
        {note && <p className="ui-small">{note}</p>}
      </div>
      {children}
    </section>
  );
}

// One area's tasks in a card. Long areas show the first few, then "Show more".
function ZoneGroup({ zone, items, renderRow, onMarkAllDone }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, GROUP_PREVIEW);
  const hidden = items.length - visible.length;
  return (
    <Card variant="flush">
      <div className="ui-group-header">
        <h3 className="ui-group-header__title">{zoneName(zone)}</h3>
        <span className="ui-row" style={{ flexWrap: "nowrap" }}>
          <span className="ui-count">{items.length}</span>
          <Button variant="secondary" size="sm" onClick={onMarkAllDone}
            aria-label={`Mark all ${items.length} ${zone ? zone.name : "No zone"} tasks done`}>
            Mark all done
          </Button>
        </span>
      </div>
      <ul className="ui-list">{visible.map(item => renderRow(item))}</ul>
      {hidden > 0 && (
        <div className="ui-group-footer">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>Show {hidden} more</Button>
        </div>
      )}
    </Card>
  );
}

// A collapsed bundle of old tasks for one area, cleared with one button
function StaleGroup({ zone, items, onMarkAllDone, renderRow }) {
  const [open, setOpen] = useState(false);
  const listId = `stale-${zone?.id ?? "none"}`;
  return (
    <Card variant="flush">
      <div className="ui-group-header">
        <button type="button" className="ui-disclosure" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(v => !v)}>
          {zoneName(zone)} · {items.length} task{items.length !== 1 ? "s" : ""}
          <Icon name="chevronDown" width="16" height="16" />
        </button>
        <Button variant="secondary" size="sm" onClick={onMarkAllDone}>Mark all done</Button>
      </div>
      {open && <ul id={listId} className="ui-list">{items.map(item => renderRow(item))}</ul>}
    </Card>
  );
}

function TaskFilterSheet({ open, onClose, zones, hasNoZone, draft, setDraft, count, onApply }) {
  const set = key => value => setDraft(d => ({ ...d, [key]: value }));
  const zoneOptions = [
    ...zones.map(z => ({ value: z.id, label: z.name })),
    ...(hasNoZone ? [{ value: NO_ZONE, label: "No zone" }] : []),
  ];
  return (
    <Sheet
      open={open}
      title="Filter tasks"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={() => setDraft(EMPTY_TASK_FILTERS)}>Clear all</Button>
        <Button onClick={onApply} disabled={count === 0}>
          {count === 0 ? "No matches" : `Show ${count} task${count === 1 ? "" : "s"}`}
        </Button>
      </>}
    >
      <OptionGroup label="Task" value={draft.type} onChange={set("type")} options={TASK_TYPES} />
      <OptionGroup label="Zone" value={draft.zone} onChange={set("zone")} options={zoneOptions} />
    </Sheet>
  );
}

// ─── Task row (also used on Home) ─────────────────────────────────────────────

const COMPLETE_DELAY_MS = 1200;

export function TaskRow({ seed, task, done, onToggle }) {
  const [completing, setCompleting] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const guidance = !done && task.status === "current" ? taskGuidance(seed, task.type) : null;
  const checked = done || completing;

  function handleCheck() {
    if (done) { onToggle(); return; }
    if (completing) return;
    // Show the tick for a moment so the change is visible, then remove the row
    setCompleting(true);
    timer.current = setTimeout(onToggle, COMPLETE_DELAY_MS);
  }

  return (
    <div className={`ui-list-row ui-task${completing ? " ui-task--completing" : ""}${done ? " ui-task--done" : ""}`}>
      <button
        type="button"
        className="ui-check-circle"
        role="checkbox"
        aria-checked={checked}
        aria-label={`${TYPE_LABEL[task.type]} ${seed.name}`}
        onClick={handleCheck}
      >
        <span aria-hidden="true">{checked && <Icon name="check" width="14" height="14" strokeWidth="2.5" />}</span>
      </button>
      <Link to={`/seeds/${seed.id}`} className="ui-task__body">
        <span className="ui-row" style={{ gap: "var(--space-2)", flexWrap: "nowrap" }}>
          <span aria-hidden="true">{seed.emoji || "🌱"}</span>
          <span className="ui-subtitle ui-truncate ui-task__name">{seed.name}</span>
          {seed.variety && seed.variety !== "Standard" && (
            <span className="ui-small ui-truncate hide-on-phone">{seed.variety}</span>
          )}
        </span>
        {guidance && <span className="ui-small ui-clamp-2">{guidance}</span>}
        {task.status === "overdue" && !done && (
          <span className="ui-small" style={{ color: "var(--color-error)" }}>
            {task.daysOverdue === 1 ? "1 day late" : `${task.daysOverdue} days late`}
          </span>
        )}
      </Link>
      <Tag tone={done ? undefined : TYPE_TONE[task.type]}>{TYPE_LABEL[task.type]}</Tag>
    </div>
  );
}
