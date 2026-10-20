import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}: StatCardProps) {
  const variantStyles = {
    default: {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-blue-50 text-blue-700',
      valueColor: 'text-slate-900',
    },
    success: {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-emerald-50 text-emerald-700',
      valueColor: 'text-emerald-700',
    },
    warning: {
      bg: 'bg-white',
      border: 'border-amber-200',
      iconBg: 'bg-amber-50 text-amber-700',
      valueColor: 'text-amber-800',
    },
    danger: {
      bg: 'bg-white',
      border: 'border-rose-200',
      iconBg: 'bg-rose-50 text-rose-700',
      valueColor: 'text-rose-700',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className={`p-5 rounded-xl border ${style.border} ${style.bg} shadow-sm flex flex-col justify-between`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        <div className={`p-2.5 rounded-lg ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <div className={`text-2xl font-bold tracking-tight ${style.valueColor}`}>{value}</div>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
