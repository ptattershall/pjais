import React from 'react';

export type MetricsCardStatus = 'good' | 'warning' | 'danger' | 'neutral';

interface MetricsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  status?: MetricsCardStatus;
  unit?: string;
  className?: string;
  ariaLabel?: string;
}

const statusStyles: Record<MetricsCardStatus, string> = {
  good: 'border-green-500 bg-green-50 text-green-800',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
  danger: 'border-red-500 bg-red-50 text-red-800',
  neutral: 'border-gray-300 bg-white text-gray-800',
};

const statusIcons: Record<MetricsCardStatus, React.ReactNode> = {
  good: <span aria-hidden="true">✅</span>,
  warning: <span aria-hidden="true">⚠️</span>,
  danger: <span aria-hidden="true">⛔</span>,
  neutral: <span aria-hidden="true">📊</span>,
};

export const MetricsCard: React.FC<MetricsCardProps> = ({
  label,
  value,
  icon,
  status = 'neutral',
  unit,
  className = '',
  ariaLabel,
}) => (
  <div
    className={`flex flex-col items-center justify-center border rounded-lg shadow-sm p-4 min-w-[120px] min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusStyles[status]} ${className}`}
    role="region"
    aria-label={ariaLabel || label}
    tabIndex={0}
  >
    <div className="flex items-center gap-2 mb-2">
      {icon || statusIcons[status]}
      <span className="text-sm font-medium select-none">{label}</span>
    </div>
    <div className="flex items-end gap-1">
      <span className="text-2xl font-bold select-all">{value}</span>
      {unit && <span className="text-xs text-gray-500 select-none">{unit}</span>}
    </div>
  </div>
); 