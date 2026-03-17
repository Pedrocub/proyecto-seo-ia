"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/leads", label: "Leads", icon: "👥" },
  { href: "/admin/audits", label: "Auditorías", icon: "📋" },
  { href: "/admin/campaigns", label: "Campañas", icon: "📧" },
  { href: "/admin/settings", label: "Configuración", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-navy-950 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-navy-800">
        <h1 className="font-[family-name:var(--font-poppins)] text-xl font-bold text-white">
          Liderify<span className="text-teal-400"> SEO AI</span>
        </h1>
        <p className="text-navy-400 text-xs mt-1">Panel de Control</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-600/20 text-teal-400"
                  : "text-navy-300 hover:text-white hover:bg-navy-800"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-navy-800">
        <p className="text-navy-500 text-xs">Liderify v1.0</p>
      </div>
    </aside>
  );
}
