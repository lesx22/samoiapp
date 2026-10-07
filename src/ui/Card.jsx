import { createElement } from "react";

const cx = (...c) => c.filter(Boolean).join(" ");

// variant: default, muted (grey fill, no border), flush (no padding, for lists)
// as: the element to render, for example "section" or "li"
export function Card({ as = "div", variant, interactive, className, ...props }) {
  return createElement(as, {
    className: cx("ui-card", variant && `ui-card--${variant}`, interactive && "ui-card--interactive", className),
    ...props,
  });
}
