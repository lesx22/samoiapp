import { useEffect, useState } from "react";

// Ignore tiny scroll jitters so the header doesn't flicker
const SLACK = 8;

// Header stays visible near the top and when scrolling up; hides when scrolling down
export function nextHeaderHidden(prevY, y, hidden, headerHeight = 56) {
  if (y <= headerHeight) return false;
  if (y > prevY + SLACK) return true;
  if (y < prevY - SLACK) return false;
  return hidden;
}

export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let prevY = window.scrollY;
    let current = false;
    const onScroll = () => {
      const y = window.scrollY;
      const next = nextHeaderHidden(prevY, y, current);
      // Only move the reference point once the scroll is bigger than the jitter allowance
      if (Math.abs(y - prevY) > SLACK) prevY = y;
      if (next !== current) { current = next; setHidden(next); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}
