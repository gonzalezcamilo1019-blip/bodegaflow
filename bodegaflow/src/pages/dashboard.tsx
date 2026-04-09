import { useGetDashboardSummary, useGetLowStockProducts, useGetRecentActivity } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Package, AlertTriangle, ClipboardList, DollarSign, Warehouse, Activity } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "wouter";

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: lowStock, isLoading: lowStockLoading } = useGetLowStockProducts();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {summaryLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-4 h-24 animate-pulse" />
            ))
          ) : (
            <>
              <StatCard label="Productos" value={summary?.totalProducts ?? 0} icon={Package} color="bg-blue-100 text-blue-700" />
              <StatCard label="Bajo stock" value={summary?.lowStockCount ?? 0} icon={AlertTriangle} color="bg-red-100 text-red-700" />
              <StatCard label="Req. pendientes" value={summary?.pendingRequisitions ?? 0} icon={ClipboardList} color="bg-amber-100 text-amber-700" />
              <StatCard label="Valor inventario" value={formatCurrency(summary?.totalInventoryValue ?? 0)} icon={DollarSign} color="bg-green-100 text-green-700" />
              <StatCard label="Bodegas" value={summary?.totalWarehouses ?? 0} icon={Warehouse} color="bg-purple-100 text-purple-700" />
              <StatCard label="Mov. hoy" value={summary?.todayMovements ?? 0} icon={Activity} color="bg-slate-100 text-slate-700" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Low stock */}
          <div className="bg-card border border-card-border rounded-xl shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h2 className="font-semibold text-foreground">Productos bajo stock</h2>
              </div>
              <span className="text-xs text-muted-foreground">{lowStock?.length ?? 0} productos</span>
            </div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {lowStockLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))
              ) : lowStock?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Todos los productos tienen stock suficiente
                </div>
              ) : (
                lowStock?.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between" data-testid={`low-stock-product-${p.id}`}>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.code} · {p.warehouseName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{p.currentStock} {p.inventoryUnit}</p>
                      <p className="text-xs text-muted-foreground">min: {p.minimumStock}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-card border border-card-border rounded-xl shadow-sm">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Actividad reciente</h2>
            </div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {activityLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-4/5 mb-1" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                ))
              ) : activity?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Sin actividad reciente</div>
              ) : (
                activity?.map((item) => (
                  <div key={item.id} className="p-3">
                    <p className="text-sm text-foreground capitalize">{item.description}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground">{item.userName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
