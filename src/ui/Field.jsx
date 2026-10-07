import { cloneElement, useId } from "react";
import { Icon } from "./icons";

// Wraps one input with its label, hint and error, and links them for screen readers
export function Field({ label, hint, error, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const control = cloneElement(children, {
    id,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? true : undefined,
  });
  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>{label}</label>
      {control}
      {hint && <span id={hintId} className="ui-field__hint">{hint}</span>}
      {error && <span id={errorId} className="ui-field__error">{error}</span>}
    </div>
  );
}

export const Input = (props) => <input className="ui-input" {...props} />;
export const Textarea = (props) => <textarea className="ui-textarea" {...props} />;
export const Select = ({ children, ...props }) => <select className="ui-select" {...props}>{children}</select>;

export function SearchInput({ label = "Search", ...props }) {
  return (
    <div className="ui-search">
      <Icon name="search" />
      <input type="search" className="ui-input" aria-label={label} {...props} />
    </div>
  );
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="ui-check">
      <input type="checkbox" {...props} />
      {label}
    </label>
  );
}
