"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import {
    LayoutDashboard,
    Settings,
    FileText,
    BookOpen,
    Server,
    ChevronRight,
    Building2,
    Mic,
    Video,
    ChefHat,
    FolderOpen,
    Library,
    Kanban,
    Archive,
    CircleDot,
} from "lucide-react";

// Main navigation (top level)
const navigation = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        name: "Produção (Kanban)",
        href: "/board",
        icon: Kanban,
    },
    {
        name: "Legacy",
        href: "/jobs",
        icon: Archive,
        children: [
            { name: "Jobs (Lista)", href: "/jobs" },
            { name: "Novo Job (Auto)", href: "/jobs/new" },
            { name: "Wizard", href: "/wizard" },
        ],
    },
];

// Projetos section
const projectsNavigation = [
    { name: "Canais YouTube", href: "/admin/projects", icon: Building2 },
];

// Configurações Globais
const configNavigation = [
    { name: "Integrações", href: "/admin/providers", icon: Server },
    { name: "Vozes Disponíveis", href: "/admin/presets?type=voice", icon: Mic },
    { name: "Resoluções", href: "/admin/presets?type=video", icon: Video },
    { name: "ImageFX", href: "/admin/imagefx-config", icon: Settings },
];

// Avançado
const advancedNavigation = [
    { name: "Fluxos de Produção", href: "/admin/recipes", icon: ChefHat },
    { name: "Prompts Globais", href: "/admin/prompts", icon: FileText },
    { name: "Knowledge Base", href: "/admin/knowledge-base", icon: BookOpen },
];

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";

        const [itemPath, itemQuery] = href.split("?");
        const currentType = searchParams.get("type");

        if (!pathname.startsWith(itemPath)) return false;

        if (itemQuery) {
            const expectedType = new URLSearchParams(itemQuery).get("type");
            return currentType === expectedType;
        }

        return !currentType;
    };

    const NavItem = ({ item }: { item: { name: string; href: string; icon: React.ElementType } }) => (
        <Link
            href={item.href}
            className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150",
                isActive(item.href)
                    ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium"
                    : "text-zinc-400 hover:bg-[#111111] hover:text-white"
            )}
        >
            <item.icon className="size-3.5 shrink-0" />
            <span className="truncate">{item.name}</span>
            {isActive(item.href) && (
                <ChevronRight className="size-3 ml-auto text-[#D4AF37]/60 shrink-0" />
            )}
        </Link>
    );

    const SectionHeader = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
        <p className="flex items-center gap-1.5 px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            <Icon className="size-3 shrink-0" />
            {label}
        </p>
    );

    return (
        <aside
            className={cn(
                "flex w-64 shrink-0 flex-col bg-[#0A0A0A] border-r border-white/5 h-screen sticky top-0",
                className
            )}
        >
            {/* Logo */}
            <div className="flex items-center px-5 py-5 border-b border-white/5">
                <Link href="/">
                    <Logo size="sm" />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-5 flex flex-col gap-6">
                {/* Main Navigation */}
                <div className="flex flex-col gap-0.5">
                    {navigation.map((item) => (
                        <div key={item.name}>
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150",
                                    isActive(item.href)
                                        ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium"
                                        : "text-zinc-400 hover:bg-[#111111] hover:text-white"
                                )}
                            >
                                <item.icon className="size-3.5 shrink-0" />
                                <span className="truncate">{item.name}</span>
                                {isActive(item.href) && (
                                    <ChevronRight className="size-3 ml-auto text-[#D4AF37]/60 shrink-0" />
                                )}
                            </Link>
                            {/* Collapsed children shown when parent is active */}
                            {item.children && isActive(item.href) && (
                                <div className="ml-7 mt-1 flex flex-col gap-0.5">
                                    {item.children.map((child) => (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-150",
                                                pathname === child.href
                                                    ? "text-[#D4AF37] font-medium"
                                                    : "text-zinc-400 hover:text-white"
                                            )}
                                        >
                                            <ChevronRight className="size-3 shrink-0" />
                                            {child.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Projetos Section */}
                <div>
                    <SectionHeader icon={FolderOpen} label="Projetos" />
                    <div className="flex flex-col gap-0.5">
                        {projectsNavigation.map((item) => (
                            <NavItem key={item.name} item={item} />
                        ))}
                    </div>
                </div>

                {/* Configurações Globais */}
                <div>
                    <SectionHeader icon={Settings} label="Configurações" />
                    <div className="flex flex-col gap-0.5">
                        {configNavigation.map((item) => (
                            <NavItem key={item.name} item={item} />
                        ))}
                    </div>
                </div>

                {/* Avançado */}
                <div>
                    <SectionHeader icon={Library} label="Avançado" />
                    <div className="flex flex-col gap-0.5">
                        {advancedNavigation.map((item) => (
                            <NavItem key={item.name} item={item} />
                        ))}
                    </div>
                </div>
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <div className="relative size-2">
                        <CircleDot className="size-2 text-emerald-500" />
                        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/40" />
                    </div>
                    <span className="text-[11px] text-zinc-600">Sistema operacional</span>
                </div>
            </div>
        </aside>
    );
}
