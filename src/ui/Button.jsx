import { Icon } from "./icons";

const cx = (...c) => c.filter(Boolean).join(" ");

// variant: primary (the one main action), secondary, ghost (low emphasis), danger
// size: "sm" for dense rows; icon-only buttons need an aria-label
export function Button({ variant = "primary", size, icon, iconOnly, block, loading, className, children, disabled, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={cx("ui-btn", `ui-btn--${variant}`, size && `ui-btn--${size}`, iconOnly && "ui-btn--icon", block && "ui-btn--block", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon && <Icon name={icon} />}
      {!iconOnly && children}
    </button>
  );
}
