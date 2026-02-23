import { Menu } from "lucide-react";
import { useMobileSidebar } from "@/lib/mobileSidebarStore";

export function MobileMenuButton() {
  const toggle = useMobileSidebar((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      className="md:hidden rounded-md p-1.5 text-stone-600 hover:bg-stone-100 transition-colors"
      aria-label="Toggle menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
