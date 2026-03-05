import Link from "next/link";
import {
  KanbanIcon,
  ListIcon,
  SettingsIcon,
  CircleDotIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/board", label: "Board", icon: KanbanIcon },
  { href: "/jobs", label: "Jobs", icon: ListIcon },
  { href: "/admin", label: "Admin", icon: SettingsIcon },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A]">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-[#111111] border-r border-white/5">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <span className="text-base font-bold tracking-tight text-[#D4AF37]">
            ArqueOps Tube
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Status indicator */}
        <div className="px-5 py-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <CircleDotIcon className="size-3 text-emerald-500" />
            <span className="text-xs text-zinc-500">Sistema operacional</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center px-6 border-b border-white/5 bg-[#0A0A0A]">
          <span className="text-sm text-zinc-400">ArqueOps Tube</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
