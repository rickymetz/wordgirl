import { Link } from "react-router-dom";
import { House } from "lucide-react";

/** Header link back to the hub — generous hit area, quiet icon. */
export function HomeLink() {
  return (
    <Link
      to="/"
      aria-label="WordGirl home"
      className="-m-2.5 p-2.5 text-ink-soft active:scale-90"
    >
      <House aria-hidden className="h-6 w-6" />
    </Link>
  );
}
