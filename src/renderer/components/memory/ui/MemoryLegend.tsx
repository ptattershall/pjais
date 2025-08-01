import React from 'react';
import { MEMORY_TIER_COLORS } from '../utils/d3-utils';
import { MemoryTier } from '@shared/types/memory';

interface LegendItem {
  tier: MemoryTier;
  label: string;
  color?: string;
}

interface MemoryLegendProps {
  items?: LegendItem[];
  className?: string;
  ariaLabel?: string;
}

const DEFAULT_ITEMS: LegendItem[] = [
  { tier: 'hot', label: 'Hot Tier', color: MEMORY_TIER_COLORS.hot },
  { tier: 'warm', label: 'Warm Tier', color: MEMORY_TIER_COLORS.warm },
  { tier: 'cold', label: 'Cold Tier', color: MEMORY_TIER_COLORS.cold },
];

export const MemoryLegend: React.FC<MemoryLegendProps> = ({
  items = DEFAULT_ITEMS,
  className = '',
  ariaLabel = 'Memory Tier Legend',
}) => (
  <nav
    className={`flex flex-row items-center gap-4 ${className}`}
    aria-label={ariaLabel}
    tabIndex={0}
  >
    {items.map(({ tier, label, color }) => (
      <div
        key={tier}
        className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
        tabIndex={0}
        aria-label={label}
        role="listitem"
      >
        <span
          className="inline-block w-4 h-4 rounded-full border border-gray-300"
          style={{ backgroundColor: color || MEMORY_TIER_COLORS[tier] }}
          aria-hidden="true"
        />
        <span className="text-xs text-gray-700 select-none">{label}</span>
      </div>
    ))}
  </nav>
); 