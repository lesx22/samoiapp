import { useEffect, useId, useRef } from "react";
import { Button } from "./Button";

// A panel for secondary tasks such as filters: slides up from the bottom on
// phones and in from the right on desktop. Escape or the backdrop closes it,
// focus moves into it on open and returns to the opener on close.
export function Sheet({ open, title, onClose, footer, children }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    panelRef.current?.focus();
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ui-sheet-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="ui-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <div className="ui-sheet__header">
          <h2 id={titleId} className="ui-title">{title}</h2>
          <Button variant="ghost" size="sm" iconOnly icon="close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="ui-sheet__body">{children}</div>
        {footer && <div className="ui-sheet__footer">{footer}</div>}
      </div>
    </div>
  );
}

// One group of pick-one options inside a sheet, shown as pills
export function OptionGroup({ label, options, value, onChange }) {
  return (
    <fieldset className="ui-option-group">
      <legend className="ui-label">{label}</legend>
      <div className="ui-row">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className="ui-option"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value === value ? "" : o.value)}
          >
            {o.dot && <span className="ui-dot" style={{ background: o.dot }} aria-hidden="true" />}
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
