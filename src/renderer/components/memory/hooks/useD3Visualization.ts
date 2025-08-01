import { useEffect, DependencyList } from 'react';
import * as d3 from 'd3';

/**
 * D3DrawFunction - Type for a generic D3 draw function
 * @template TData - Data type for visualization
 * @param container - SVG or HTML element (SVGSVGElement | HTMLDivElement)
 * @param data - Data for visualization
 * @param config - Optional config object
 */
export type D3DrawFunction<TData, TConfig = unknown> = (
  container: SVGSVGElement | HTMLDivElement,
  data: TData,
  config?: TConfig
) => void;

/**
 * useD3Visualization - Shared hook for D3.js rendering and lifecycle management
 * @template TData - Data type for visualization
 * @template TConfig - Config type for visualization
 * @param ref - React ref to SVG or container element
 * @param data - Visualization data
 * @param draw - D3 render function (container, data, config)
 * @param config - Optional config object (dimensions, colors, etc.)
 * @param deps - Dependency array for re-rendering
 * @returns void
 */
export const useD3Visualization = <TData, TConfig = unknown>(
  ref: React.RefObject<SVGSVGElement | HTMLDivElement>,
  data: TData,
  draw: D3DrawFunction<TData, TConfig>,
  config?: TConfig,
  deps: DependencyList = []
): void => {
  useEffect(() => {
    if (!ref.current) return;
    // Run draw function
    draw(ref.current, data, config);
    // Cleanup on unmount or deps change
    return () => {
      d3.select(ref.current).selectAll('*').remove();
      // Optionally: remove listeners, tooltips, etc.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, data, config, ...deps]);
}; 