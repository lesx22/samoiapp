import { Icon } from "./icons";

// tone: neutral, green, warn, error
export function Tag({ tone, children }) {
  return <span className={tone ? `ui-tag ui-tag--${tone}` : "ui-tag"}>{children}</span>;
}

// An applied filter shown on the page; the cross removes it
export function Chip({ children, onRemove }) {
  return (
    <span className="ui-chip">
      {children}
      <button type="button" onClick={onRemove} aria-label={`Remove ${children}`}>
        <Icon name="close" />
      </button>
    </span>
  );
}

// Pick one of a few options, for example a list or grid view
export function Segmented({ label, options, value, onChange }) {
  return (
    <div className="ui-segmented" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
