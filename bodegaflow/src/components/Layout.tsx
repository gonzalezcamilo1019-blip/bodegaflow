import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  History,
  LogOut,
  Menu,
  X,
  Warehouse,
  ClipboardCheck,
  BarChart3,
  PackageSearch,
  Truck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const PURCHASING_ROLES = ["lider_compras", "auxiliar_compras"];

function NavItem({ href, label, icon: Icon, currentPath, onClick }: {
  href: string;
  label: string;
  icon: React.ElementType;
  currentPath: string;
  onClick?: () => void;
}) {
  const isActive = currentPath === href || (href !== "/" && currentPath.startsWith(href));
  return (
    <Link href={href} onClick={onClick}>
      <span
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          isActive
            ? "bg-amber-500 text-slate-900"
            : "text-slate-300 hover:bg-slate-700 hover:text-white"
        }`}
      >
        <Icon size={18} />
        {label}
      </span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPurchasing = user ? PURCHASING_ROLES.includes(user.role) : false;

  const navItems = isPurchasing
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/requisitions", label: "Requisiciones", icon: ClipboardList },
        { href: "/inventory/products", label: "Productos", icon: PackageSearch },
        { href: "/inventory", label: "Inventario", icon: Warehouse },
        { href: "/inventory/movements", label: "Kardex", icon: History },
        { href: "/inventory/physical-counts", label: "Toma Física", icon: ClipboardCheck },
        { href: "/inventory/differences", label: "Diferencias", icon: BarChart3 },
        { href: "/suppliers", label: "Proveedores", icon: Truck },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/requisitions/new", label: "Nueva Requisicion", icon: ShoppingCart },
        { href: "/requisitions", label: "Mis Requisiciones", icon: ClipboardList },
      ];

  const sidebar = (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Package size={16} className="text-slate-900" />
          </div>
          <span className="font-bold text-white text-lg">BodegaFlow</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            currentPath={location}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          {user?.areaName && (
            <p className="text-amber-400 text-xs mt-0.5">{user.areaName}</p>
          )}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col">
        {sidebar}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 flex flex-col shadow-2xl">{sidebar}</div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 rounded flex items-center justify-center">
              <Package size={14} className="text-slate-900" />
            </div>
            <span className="font-bold text-white">BodegaFlow</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-300 hover:text-white">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
