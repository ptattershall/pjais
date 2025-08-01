import { ChartType, TooltipItem } from 'chart.js';

export type ChartTooltipContext<T extends ChartType = ChartType> = TooltipItem<T>; 