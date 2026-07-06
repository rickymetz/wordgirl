import { Link } from "react-router-dom";

/** Icon link back to the hub. */
export function HomeLink() {
  return (
    <Link to="/" aria-label="home" className="text-ink-soft active:scale-90">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
      </svg>
    </Link>
  );
}
