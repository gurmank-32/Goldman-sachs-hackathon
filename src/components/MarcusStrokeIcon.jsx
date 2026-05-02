/** Thin stroke icons (1.5px, round caps) — Marcus-aligned UI chrome. */

const S = {
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
};

export function MarcusStrokeIcon({
  name,
  size = 22,
  className = "",
  stroke = "currentColor",
}) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", className, "aria-hidden": true };
  const p = { ...S, stroke };

  switch (name) {
    case "home":
      return (
        <svg {...props}>
          <path {...p} d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      );
    case "chart-down":
      return (
        <svg {...props}>
          <path {...p} d="M3 3v18h18M7 14l4-4 4 4 6-7" />
        </svg>
      );
    case "flame":
      return (
        <svg {...props}>
          <path {...p} d="M12 22c4.97 0 8-3.14 8-7 0-4.33-3.38-7.09-6.47-11 .58 3.92-2.97 6.09-5.53 9.09C6.52 14.63 7 16 8 17c-.73-2.41-.36-4 1.53-6 1.9 3 1.9 6.5-.03 9C11 21 11.47 22 12 22Z" />
        </svg>
      );
    case "wallet-out":
      return (
        <svg {...props}>
          <path {...p} d="M19 7V6a2 2 0 0 0-2-2H7l3 4h8v1M16 21h2a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-9l-4-5H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4M16 14v4M14 16h4" />
        </svg>
      );
    case "trending-up":
      return (
        <svg {...props}>
          <path {...p} d="M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6" />
        </svg>
      );
    case "activity-dip":
      return (
        <svg {...props}>
          <path {...p} d="M22 12h-4l-3 9L9 3 6 12H2" />
        </svg>
      );
    case "sun":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="4" />
          <path {...p} d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32L19.07 4.93" />
        </svg>
      );
    case "book-open":
      return (
        <svg {...props}>
          <path {...p} d="M12 7v14M12 7a4 4 0 0 1 4-4h5v18h-6a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3V3h5a4 4 0 0 1 4 4Z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );
    case "zap":
      return (
        <svg {...props}>
          <path {...p} d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <rect {...p} x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path {...p} d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "calendar-range":
      return (
        <svg {...props}>
          <rect {...p} x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path {...p} d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
        </svg>
      );
    case "infinity":
      return (
        <svg {...props}>
          <path {...p} d="M12 12c-2-2.67-4.33-4-6-4a4 4 0 1 0 0 8c1.67 0 4-1.33 6-4Zm0 0c2 2.67 4.33 4 6 4a4 4 0 1 0 0-8c-1.67 0-4 1.33-6 4Z" />
        </svg>
      );
    case "arrow-down-circle":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
          <path {...p} d="M12 8v8m0 0 4-4m-4 4-4-4" />
        </svg>
      );
    case "minus-circle":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
          <path {...p} d="M8 12h8" />
        </svg>
      );
    case "circle":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
        </svg>
      );
    case "plus-circle":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
          <path {...p} d="M12 8v8M8 12h8" />
        </svg>
      );
    case "rocket":
      return (
        <svg {...props}>
          <path {...p} d="M5 13 13 5l7 7-4 4M13 5v4l4 4M9 17l-4 6 6-4" />
        </svg>
      );
    case "sprout":
      return (
        <svg {...props}>
          <path {...p} d="M12 22v-7m0 0c-4 0-7-3-7-7 4 0 7 3 7 7Zm0 0c4 0 7-3 7-7-4 0-7 3-7 7Z" />
        </svg>
      );
    case "banknote":
      return (
        <svg {...props}>
          <rect {...p} x="2" y="6" width="20" height="12" rx="2" />
          <circle {...p} cx="12" cy="12" r="3" />
          <path {...p} d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case "coins":
      return (
        <svg {...props}>
          <circle {...p} cx="8" cy="8" r="6" />
          <path {...p} d="M18.09 10.37A6 6 0 1 1 10.34 18M14 14v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-5M14 14h6" />
        </svg>
      );
    case "landmark":
      return (
        <svg {...props}>
          <path {...p} d="M3 21h18M9 8h1M9 12h1M14 8h1M14 12h1M5 21V10l7-7 7 7v11M9 21v-4h6v4" />
        </svg>
      );
    case "cpu":
      return (
        <svg {...props}>
          <rect {...p} x="4" y="4" width="16" height="16" rx="2" ry="2" />
          <path {...p} d="M9 9h6v6H9zM9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3" />
        </svg>
      );
    case "mail":
      return (
        <svg {...props}>
          <rect {...p} width="20" height="16" x="2" y="4" rx="2" />
          <path {...p} d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle {...p} cx="11" cy="11" r="8" />
          <path {...p} d="m21 21-4.3-4.3" />
        </svg>
      );
    case "sliders":
      return (
        <svg {...props}>
          <path {...p} d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M9 21h6M15 15h6M6 8h6M9 3h6" />
        </svg>
      );
    case "chart-bar":
      return (
        <svg {...props}>
          <path {...p} d="M3 3v18h18M7 16v-5M12 16V8m5 8v-9" />
        </svg>
      );
    case "building-columns":
      return (
        <svg {...props}>
          <path {...p} d="M4 21h16M6 21V10l6-4 6 4v11M10 21v-8h4v8" />
        </svg>
      );
    case "scroll-text":
      return (
        <svg {...props}>
          <path {...p} d="M15 12h-5M15 16h-5M14 21h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h1M10 21v-9l5 5 5-5v9" />
        </svg>
      );
    case "layers":
      return (
        <svg {...props}>
          <path {...p} d="m12.83 2.18 8 3.75v9.06l-8 3.75-8-3.75V5.93l8-3.75ZM12 12 20.5 8M12 12v10M12 12 3.5 8" />
        </svg>
      );
    case "scale":
      return (
        <svg {...props}>
          <path {...p} d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Zm-11 0 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 16h10M12 3v18M9 3h6" />
        </svg>
      );
    case "message-circle":
      return (
        <svg {...props}>
          <path {...p} d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path {...p} d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21h3.4c.3 0 .6-.2.7-.5l.3-.9H9.3l.3.9c.1.3.4.5.7.5Z" />
        </svg>
      );
    case "compass":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
          <path {...p} d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z" />
        </svg>
      );
    case "alert-triangle":
      return (
        <svg {...props}>
          <path {...p} d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01" />
        </svg>
      );
    case "check-circle":
      return (
        <svg {...props}>
          <path {...p} d="M22 11.08V12a10 10 0 1 1-5.93-9.17M22 4 12 14.01l-3-3" />
        </svg>
      );
    case "lightbulb":
      return (
        <svg {...props}>
          <path {...p} d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...props}>
          <path {...p} d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
        </svg>
      );
    case "hand-wave":
      return (
        <svg {...props}>
          <path {...p} d="M18 11h-2v9H8v-7l-2 .5V11l6-2 2 2h2v-2a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "octagon-alert":
      return (
        <svg {...props}>
          <path {...p} d="M12 16h.01M12 8v4m8.98-.61 2.18 6.42a2 2 0 0 1-1.27 2.53l-7.08 2.54a2 2 0 0 1-1.36 0L6.37 20.34a2 2 0 0 1-1.27-2.53L7.28 11.4a2 2 0 0 1 .87-1.18l6.07-4.05a2 2 0 0 1 2.56 0l6.07 4.05a2 2 0 0 1 .87 1.18l2.18 6.42Z" />
        </svg>
      );
    case "alert-circle":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
          <path {...p} d="M12 8v4M12 16h.01" />
        </svg>
      );
    case "target":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
          <circle {...p} cx="12" cy="12" r="6" />
          <circle {...p} cx="12" cy="12" r="2" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path {...p} d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow-up":
      return (
        <svg {...props}>
          <path {...p} d="M12 19V5m0 0-7 7m7-7 7 7" />
        </svg>
      );
    case "arrow-down":
      return (
        <svg {...props}>
          <path {...p} d="M12 5v14m0 0 7-7m-7 7-7-7" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path {...p} d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "thumbs-up":
      return (
        <svg {...props}>
          <path {...p} d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3 3 0 0 1 3 3v5Z" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...props}>
          <path {...p} d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.7 8.7 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.7-8.7 2.1-2.1M12 8l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4Z" />
        </svg>
      );
    case "circle-dot":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
          <circle {...p} cx="12" cy="12" r="3" />
        </svg>
      );
    case "menu":
      return (
        <svg {...props}>
          <path {...p} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "orbit":
      return (
        <svg {...props}>
          <ellipse {...p} cx="12" cy="12" rx="9" ry="4" transform="rotate(25 12 12)" />
          <circle {...p} cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "ban":
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
          <path {...p} d="m4.93 4.93 14.14 14.14" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle {...p} cx="12" cy="12" r="10" />
        </svg>
      );
  }
}
