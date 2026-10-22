"use client";

const decorations = [
  {
    id: "bug",
    className: "float-bug",
    style: { top: "19%", left: "9%" },
    content: (
      <svg viewBox="0 0 64 64" fill="none">
        <g
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 22 17 16M41 22l6-6" />
          <path d="M19 31H11M45 31h8" />
          <path d="M22 42l-6 6M42 42l6 6" />
          <rect x="21" y="18" width="22" height="30" rx="11" />
          <path d="M26 35c2 3 10 3 12 0" />
        </g>
        <circle cx="27.5" cy="29" r="2" fill="currentColor" />
        <circle cx="36.5" cy="29" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "code",
    className: "float-code",
    style: { top: "34%", right: "8%" },
    content: (
      <svg viewBox="0 0 64 64" fill="none">
        <path
          d="m24 20-13 12 13 12M40 20l13 12-13 12M36 14l-8 36"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "terminal",
    className: "float-terminal",
    style: { top: "57%", left: "5%" },
    content: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect
          x="8"
          y="12"
          width="48"
          height="40"
          rx="7"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 23h48M16 18h1M22 18h1M28 18h1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="m18 32 7 5-7 5M30 42h12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "sparkles",
    className: "float-sparkles",
    style: { top: "13%", right: "17%" },
    content: (
      <svg viewBox="0 0 64 64" fill="none">
        <path
          d="M32 6 37 25 56 30 37 35 32 54 27 35 8 30 27 25 32 6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m49 43 2.5 7.5L59 53l-7.5 2.5L49 63l-2.5-7.5L39 53l7.5-2.5L49 43Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "nodes",
    className: "float-nodes",
    style: { top: "71%", right: "10%" },
    content: (
      <svg viewBox="0 0 64 64" fill="none">
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M19 20 43 15 47 43 18 47 19 20Z" />
          <path d="M19 20 32 32 43 15M32 32 47 43M32 32 18 47" />
        </g>
        <circle cx="19" cy="20" r="5" fill="currentColor" />
        <circle cx="43" cy="15" r="5" fill="currentColor" />
        <circle cx="47" cy="43" r="5" fill="currentColor" />
        <circle cx="18" cy="47" r="5" fill="currentColor" />
        <circle cx="32" cy="32" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "brackets",
    className: "float-brackets",
    style: { top: "82%", left: "19%" },
    content: (
      <svg viewBox="0 0 64 64" fill="none">
        <path
          d="M25 13H15V51H25M39 13H49V51H39"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="32" r="3" fill="currentColor" />
      </svg>
    ),
  },
];

export default function FloatingDecorations() {
  return (
    <div className="floating-decorations" aria-hidden="true">
      {decorations.map((item, index) => (
        <span
          key={item.id}
          className={`floating-decoration ${item.className}`}
          style={{
            ...item.style,
            "--float-delay": `${index * -1.7}s`,
            "--float-duration": `${6 + (index % 3) * 1.5}s`,
          }}
        >
          {item.content}
        </span>
      ))}
    </div>
  );
}
