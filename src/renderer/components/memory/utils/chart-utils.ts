import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  ChartOptions,
  ChartType,
} from 'chart.js';
import { MemoryTier } from '@shared/types/memory';
import { UsageMetrics } from '../types/analytics-types';
import { ChartTooltipContext } from '../types/chart';

// =========================
// Chart.js Registration
// =========================
export const registerMemoryCharts = (): void => {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale
  );
};

// =========================
// Color Schemes
// =========================
export const MEMORY_TIER_COLORS: Record<MemoryTier, string> = {
  hot: '#ef4444',   // Red
  warm: '#f59e0b',  // Orange
  cold: '#3b82f6',  // Blue
};

export const MEMORY_TIER_BG_COLORS: Record<MemoryTier, string> = {
  hot: 'rgba(239, 68, 68, 0.8)',
  warm: 'rgba(245, 158, 11, 0.8)',
  cold: 'rgba(59, 130, 246, 0.8)',
};

// =========================
// Default Chart Options
// =========================
export const getDefaultChartOptions = <T extends ChartType>(
  type: T,
  label: string
): ChartOptions<T> => ({
  responsive: true,
  animation: { duration: 600 },
  plugins: {
    title: { display: true, text: label },
    legend: { display: type === 'bar' },
    tooltip: { enabled: true },
  },
  scales: {
    x: { title: { display: true, text: 'X Axis' } },
    y: { title: { display: true, text: 'Y Axis' }, beginAtZero: true },
  },
} as ChartOptions<T>);

// =========================
// Data Downsampling Utility
// =========================
export function downsampleArray<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(data[Math.floor(i * step)]);
  }
  return result;
}

// =========================
// Data Transformation
// =========================
export const getTierChartData = (metrics: UsageMetrics) => ({
  labels: metrics.tierActivity.map(t => t.tier.toUpperCase()),
  datasets: [
    {
      label: 'Access Count',
      data: metrics.tierActivity.map(t => t.accesses),
      backgroundColor: metrics.tierActivity.map(t => MEMORY_TIER_BG_COLORS[t.tier as MemoryTier] || '#e5e7eb'),
      borderColor: metrics.tierActivity.map(t => MEMORY_TIER_COLORS[t.tier as MemoryTier] || '#6b7280'),
      borderWidth: 2,
    },
  ],
});

export const getHourlyChartData = (metrics: UsageMetrics, maxPoints = 24) => {
  const sampledData = downsampleArray(metrics.hourlyActivity, maxPoints);
  return {
    labels: sampledData.map((_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Memory Access Count',
        data: sampledData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };
};

export const getDailyChartData = (metrics: UsageMetrics, maxPoints = 60) => {
  const sampledData = downsampleArray(metrics.dailyAccess, maxPoints);
  return {
    labels: sampledData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Access Count',
        data: sampledData.map(d => d.count),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10b981',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Avg Importance',
        data: sampledData.map(d => d.importance),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: '#f59e0b',
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  };
};

// =========================
// Tooltip Formatting
// =========================
export const formatTooltipLabel = <T extends ChartType>(context: ChartTooltipContext<T>): string => {
  // Type guard for dataset label
  const label = (context.dataset as { label?: string })?.label;
  // Type guard for parsed.y
  const y = (context.parsed as { y?: number | string })?.y;
  if (label !== undefined && y !== undefined) {
    return `${label}: ${y}`;
  }
  // Fallback: stringify parsed value if possible
  if (typeof context.parsed === 'object' && context.parsed !== null) {
    return Object.values(context.parsed).join(', ');
  }
  return String(context.parsed);
};

// =========================
// Gradient Utility
// =========================
export const getGradient = (
  ctx: CanvasRenderingContext2D,
  area: { top: number; bottom: number },
  colorStops: Array<{ offset: number; color: string }>
): CanvasGradient => {
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  colorStops.forEach(({ offset, color }) => {
    gradient.addColorStop(offset, color);
  });
  return gradient;
};

// =========================
// Accessibility Helpers
// =========================
export const getAccessibleChartProps = (label: string) => ({
  role: 'img',
  'aria-label': label,
  tabIndex: 0,
}); 