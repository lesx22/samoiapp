import { useState, useMemo, useId } from "react";
import { Link } from "react-router-dom";
import { useSeedsContext } from "../context/SeedsContext";
import { MONTHS, TODAY_M } from "../data/garden";
import { activeFilters } from "../lib/plantFilters";
import { EMPTY_CAL_FILTERS, NO_ZONE, filterCalendar, groupCalendar, monthsFor, seasonSummary } from "../lib/calendar";
import { Button, Card, SearchInput, Select, Chip, Sheet, OptionGroup, Icon, useHideOnScroll } from "../ui";

const TYPES = [
  { value: "sow", label: "Sow" },
  { value: "transplant", label: "Transplant" },
  { value: "harvest", label: "Harvest" },
];
// Bars on the calendar, in season order. Growing isn't a task, so it isn't a filter.
const PHASES = [
  { value: "sow", label: "Sow", letter: "S" },
  { value: "transplant", label: "Transplant", letter: "T" },
  { value: "growing", label: "Growing", letter: "G" },
  { value: "harvest", label: "Harvest", letter: "H" },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map(t => [t.value, t.label]));
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const GROUPS = [
  { value: "category", label: "Category" },
  { value: "zone", label: "Zone" },
  { value: "none", label: "None (A to Z)" },
];

export default function CalendarPage() {
  const { seeds, zones } = useSeedsContext();
  const toolbarHidden = useHideOnScroll();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_CAL_FILTERS);
  const [draft, setDraft] = useState(EMPTY_CAL_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [groupBy, setGroupBy] = useState("category");

  const filtered = useMemo(() => filterCalendar(seeds, search, filters), [seeds, search, filters]);
  const groups = useMemo(() => groupCalendar(filtered, groupBy, zones), [filtered, groupBy, zones]);
  const applied = activeFilters(filters);

  const chipLabel = (key, value) => {
    if (key === "zone") return value === NO_ZONE ? "No zone" : zones.find(z => z.id === value)?.name ?? value;
    if (key === "type") return TYPE_LABEL[value];
    if (key === "month") return MONTH_NAMES[value - 1];
    return value;
  };

  return (
    <div className="ui-page">
      <div className="ui-page-header">
        <div>
          <h1 className="ui-display">Calendar</h1>
          <p className="ui-small">
            {filtered.length === seeds.length ? `${seeds.length} plants` : `${filtered.length} of ${seeds.length} plants`}
            {" · "}when to sow, transplant and harvest
          </p>
        </div>
        <Legend />
      </div>

      {seeds.length === 0 && (
        <Card variant="muted" style={{ textAlign: "center", padding: "var(--space-10) var(--space-6)" }}>
          Add plants to see your planting calendar.
        </Card>
      )}

      {seeds.length > 0 && (
        <div className={`ui-toolbar${toolbarHidden ? " ui-toolbar--hidden" : ""}`}>
          <div className="ui-toolbar__grid">
            <div className="ui-toolbar__search">
              <SearchInput label="Search plants" placeholder="Search plants" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="secondary" icon="filter" className="ui-toolbar__filter" aria-haspopup="dialog"
              onClick={() => { setDraft(filters); setSheetOpen(true); }}>
              Filter
              {applied.length > 0 && <span className="ui-tag ui-tag--green" aria-label={`${applied.length} on`}>{applied.length}</span>}
            </Button>
            <div className="ui-row ui-toolbar__end">
              <Select aria-label="Group plants by" value={groupBy} onChange={e => setGroupBy(e.target.value)}
                style={{ width: "auto", minHeight: "var(--control-h-sm)", fontSize: "var(--type-small)" }}>
                {GROUPS.map(g => <option key={g.value} value={g.value}>Group: {g.label}</option>)}
              </Select>
            </div>
            {applied.length > 0 && (
              <div className="ui-row ui-toolbar__chips">
                {applied.map(([key, value]) => (
                  <Chip key={key} onRemove={() => setFilters(f => ({ ...f, [key]: "" }))}>{chipLabel(key, value)}</Chip>
                ))}
                {applied.length > 1 && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_CAL_FILTERS)}>Clear all</Button>}
              </div>
            )}
          </div>
          {/* Month headings stay in view with the toolbar, lined up with the rows below */}
          <div className="ui-cal-row ui-cal-head" aria-hidden="true">
            <span />
            {MONTHS.map((m, i) => (
              <span key={m} className={i + 1 === TODAY_M ? "ui-cal-now" : undefined}>
                <span className="hide-on-phone">{m}</span>
                <span className="hide-on-desktop">{m[0]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {seeds.length > 0 && filtered.length === 0 && (
        <Card variant="muted" className="ui-stack" style={{ alignItems: "center", textAlign: "center", padding: "var(--space-10) var(--space-6)" }}>
          <p>No plants match your search and filters.</p>
          <Button variant="secondary" onClick={() => { setSearch(""); setFilters(EMPTY_CAL_FILTERS); }}>Clear search and filters</Button>
        </Card>
      )}

      {filtered.length > 0 && (
        <Card variant="flush">
          {groups.map(g => <CalendarGroup key={g.key} group={g} />)}
        </Card>
      )}

      <CalendarFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        zones={zones}
        hasNoZone={seeds.some(s => !s.zoneId)}
        categories={[...new Set(seeds.map(s => s.category).filter(Boolean))].sort()}
        draft={draft}
        setDraft={setDraft}
        count={filterCalendar(seeds, search, draft).length}
        onApply={() => { setFilters(draft); setSheetOpen(false); }}
      />
    </div>
  );
}

function Legend() {
  return (
    <ul className="ui-cal-legend" aria-label="Key">
      {PHASES.map(p => (
        <li key={p.value}><span className={`ui-cal-swatch ui-cal--${p.value}`} aria-hidden="true">{p.letter}</span>{p.label}</li>
      ))}
      <li><span className="ui-cal-swatch ui-cal-swatch--now" />This month</li>
    </ul>
  );
}

function CalendarGroup({ group }) {
  const [open, setOpen] = useState(true);
  const listId = useId(); // group names can contain spaces, which ids cannot
  return (
    <section>
      {group.label && (
        <h2 className="ui-group-header">
          <button type="button" className="ui-disclosure" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(v => !v)}>
            {group.label} <span className="ui-count">{group.seeds.length}</span>
            <Icon name="chevronDown" width="16" height="16" />
          </button>
        </h2>
      )}
      {open && (
        <ul id={listId} className="ui-list">
          {group.seeds.map(seed => <li key={seed.id}><CalendarRow seed={seed} /></li>)}
        </ul>
      )}
    </section>
  );
}

function CalendarRow({ seed }) {
  return (
    <div className="ui-cal-row">
      <Link to={`/seeds/${seed.id}`} className="ui-cal-name">
        <span className="ui-cal-name__title ui-clamp-2">
          <span aria-hidden="true">{seed.emoji || "🌱"} </span>{seed.name}
        </span>
        {seed.variety && seed.variety !== "Standard" && <span className="ui-small ui-truncate">{seed.variety}</span>}
      </Link>
      <span className="ui-visually-hidden">{seasonSummary(seed)}</span>
      {MONTHS.map((_, i) => {
        const m = i + 1;
        const active = PHASES.filter(p => monthsFor(seed, p.value).includes(m));
        return (
          <span key={m} className={`ui-cal-cell${m === TODAY_M ? " ui-cal-cell--now" : ""}`} aria-hidden="true">
            {/* A split month is too small for letters, so only single bars get one */}
            {active.map(p => <span key={p.value} className={`ui-cal--${p.value}`}>{active.length === 1 ? p.letter : ""}</span>)}
          </span>
        );
      })}
    </div>
  );
}

function CalendarFilterSheet({ open, onClose, zones, hasNoZone, categories, draft, setDraft, count, onApply }) {
  const set = key => value => setDraft(d => ({ ...d, [key]: value }));
  return (
    <Sheet
      open={open}
      title="Filter calendar"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={() => setDraft(EMPTY_CAL_FILTERS)}>Clear all</Button>
        <Button onClick={onApply} disabled={count === 0}>
          {count === 0 ? "No matches" : `Show ${count} plant${count === 1 ? "" : "s"}`}
        </Button>
      </>}
    >
      <OptionGroup label="Task" value={draft.type} onChange={set("type")} options={TYPES} />
      <OptionGroup label="Month" value={draft.month} onChange={set("month")}
        options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
      <OptionGroup label="Zone" value={draft.zone} onChange={set("zone")}
        options={[...zones.map(z => ({ value: z.id, label: z.name })), ...(hasNoZone ? [{ value: NO_ZONE, label: "No zone" }] : [])]} />
      <OptionGroup label="Category" value={draft.category} onChange={set("category")}
        options={categories.map(c => ({ value: c, label: c }))} />
    </Sheet>
  );
}
