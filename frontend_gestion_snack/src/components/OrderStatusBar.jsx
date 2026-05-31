// Composant OrderStatusBar — Barre de progression visuelle du statut de commande
import { CheckCircle2, ChefHat, Truck, XCircle, Clock } from 'lucide-react';

const STEPS = [
  { key: 'ACTIVE', label: 'En préparation', icon: Clock },
  { key: 'CLOSED', label: 'Prête', icon: ChefHat },
  { key: 'SERVED', label: 'Servie', icon: Truck },
];

const statusIndex = (status) => {
  if (status === 'CANCELLED') return -1;
  return STEPS.findIndex((s) => s.key === status);
};

const OrderStatusBar = ({ status, compact = false }) => {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        <span className={compact ? 'text-xs font-medium' : 'text-sm font-semibold'}>Annulée</span>
      </div>
    );
  }

  const currentIdx = statusIndex(status);

  if (compact) {
    const step = STEPS[currentIdx] || STEPS[0];
    const Icon = step.icon;
    const colors = ['text-blue-600 bg-blue-50', 'text-orange-600 bg-orange-50', 'text-green-600 bg-green-50'];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[currentIdx]}`}>
        <Icon className="h-3.5 w-3.5" />
        {step.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const upcoming = idx > currentIdx;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full transition-all duration-500
                  ${done ? 'bg-green-500 text-white shadow-md' : ''}
                  ${active ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100 scale-110' : ''}
                  ${upcoming ? 'bg-gray-100 text-gray-400' : ''}
                `}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className={`mt-1 text-[10px] font-medium whitespace-nowrap ${
                active ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 mx-1 mb-4 transition-all duration-500 ${
                done ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderStatusBar;
