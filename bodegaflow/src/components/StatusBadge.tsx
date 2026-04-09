const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-gray-100 text-gray-700 border border-gray-200" },
  enviada: { label: "Enviada", className: "bg-blue-100 text-blue-700 border border-blue-200" },
  aprobada: { label: "Aprobada", className: "bg-green-100 text-green-700 border border-green-200" },
  ajustada: { label: "Ajustada", className: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
  rechazada: { label: "Rechazada", className: "bg-red-100 text-red-700 border border-red-200" },
  despachada: { label: "Despachada", className: "bg-purple-100 text-purple-700 border border-purple-200" },
  cerrada: { label: "Cerrada", className: "bg-slate-100 text-slate-600 border border-slate-200" },
};

const MOVEMENT_CONFIG: Record<string, { label: string; className: string }> = {
  entrada_compra: { label: "Entrada compra", className: "bg-green-100 text-green-700" },
  salida_requisicion: { label: "Salida requisicion", className: "bg-blue-100 text-blue-700" },
  ajuste_manual: { label: "Ajuste manual", className: "bg-yellow-100 text-yellow-700" },
  merma: { label: "Merma", className: "bg-orange-100 text-orange-700" },
  dano: { label: "Dano", className: "bg-red-100 text-red-700" },
  vencimiento: { label: "Vencimiento", className: "bg-red-100 text-red-700" },
  traslado: { label: "Traslado", className: "bg-purple-100 text-purple-700" },
};

interface StatusBadgeProps {
  status: string;
  type?: "requisicion" | "movimiento";
}

export function StatusBadge({ status, type = "requisicion" }: StatusBadgeProps) {
  const config = type === "movimiento"
    ? MOVEMENT_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-700" }
    : STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
