import * as d3 from 'd3';

// =============================================================================
// D3 SELECTION TYPES
// =============================================================================

// Generic D3 Selection types for different element types
export type D3Selection<T extends d3.BaseType = SVGElement> = d3.Selection<T, unknown, null, undefined>;

export type D3SelectionWithData<T extends d3.BaseType, D = unknown> = d3.Selection<T, D, null, undefined>;

// Specific selection types for common SVG elements
export type SVGSelection = D3Selection<SVGSVGElement>;
export type SVGGroupSelection = D3Selection<SVGGElement>;
export type SVGCircleSelection = D3Selection<SVGCircleElement>;
export type SVGLineSelection = D3Selection<SVGLineElement>;
export type SVGRectSelection = D3Selection<SVGRectElement>;
export type SVGTextSelection = D3Selection<SVGTextElement>;

// HTML element selections
export type HTMLDivSelection = d3.Selection<HTMLDivElement, unknown, HTMLElement, undefined>;
export type HTMLElementSelection = d3.Selection<HTMLElement, unknown, HTMLElement, undefined>;

// =============================================================================
// D3 TRANSITION TYPES
// =============================================================================

// Generic transition types
export type D3Transition<T extends d3.BaseType = SVGElement> = d3.Transition<T, unknown, null, undefined>;

export type D3TransitionWithData<T extends d3.BaseType, D = unknown> = d3.Transition<T, D, null, undefined>;

// Specific transition types for common elements
export type SVGTransition = D3Transition<SVGSVGElement>;
export type SVGGroupTransition = D3Transition<SVGGElement>;
export type SVGCircleTransition = D3Transition<SVGCircleElement>;

// =============================================================================
// D3 SCALE TYPES
// =============================================================================

// Use D3's built-in AxisScale type for maximum compatibility
export type D3AxisScale<Domain = d3.AxisDomain> = d3.AxisScale<Domain>;

// Specific scale types
export type TimeScale = d3.ScaleTime<number, number>;
export type LinearScale = d3.ScaleLinear<number, number>;
export type BandScale = d3.ScaleBand<string>;
export type OrdinalScale = d3.ScaleOrdinal<string, string>;

// =============================================================================
// D3 AXIS TYPES
// =============================================================================

// Axis generator types
export type D3Axis<Domain = d3.NumberValue> = d3.Axis<Domain>;
export type D3BottomAxis = d3.Axis<d3.NumberValue>;
export type D3LeftAxis = d3.Axis<d3.NumberValue>;
export type D3TopAxis = d3.Axis<d3.NumberValue>;
export type D3RightAxis = d3.Axis<d3.NumberValue>;

// =============================================================================
// D3 ZOOM TYPES
// =============================================================================

export type D3ZoomBehavior<T extends Element = SVGSVGElement> = d3.ZoomBehavior<T, unknown>;
export type D3ZoomTransform = d3.ZoomTransform;

// =============================================================================
// D3 SIMULATION TYPES
// =============================================================================

export type D3Simulation<NodeDatum extends d3.SimulationNodeDatum> = d3.Simulation<NodeDatum, undefined>;

export type D3ForceLink<NodeDatum extends d3.SimulationNodeDatum, LinkDatum extends d3.SimulationLinkDatum<NodeDatum>> = 
  d3.ForceLink<NodeDatum, LinkDatum>;

export type D3ForceManyBody<NodeDatum extends d3.SimulationNodeDatum> = d3.ForceManyBody<NodeDatum>;

export type D3ForceCenter<NodeDatum extends d3.SimulationNodeDatum> = d3.ForceCenter<NodeDatum>;

// =============================================================================
// D3 EVENT TYPES
// =============================================================================

export type D3DragEvent<T extends Element, D> = d3.D3DragEvent<T, D, D>;
export type D3ZoomEvent<T extends Element, D> = d3.D3ZoomEvent<T, D>;

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Type for tick format functions - generic to work with any domain type
export type TickFormatFunction<Domain = d3.AxisDomain> = (domainValue: Domain, index: number) => string;

// Type for generic value formatter  
export type ValueFormatter = (value: unknown) => string;

// Type for D3 interpolator functions
export type D3Interpolator<T> = (t: number) => T;

// Color interpolator type
export type ColorInterpolator = D3Interpolator<string>;

// =============================================================================
// DATA BINDING TYPES
// =============================================================================

// Generic data join types
export type D3DataJoin<T extends d3.BaseType, D> = d3.Selection<T, D, d3.BaseType, unknown>;

export type D3EnterSelection<D> = d3.Selection<d3.EnterElement, D, d3.BaseType, unknown>;

export type D3UpdateSelection<T extends d3.BaseType, D> = d3.Selection<T, D, d3.BaseType, unknown>;

export type D3ExitSelection<T extends d3.BaseType, D> = d3.Selection<T, D, d3.BaseType, unknown>;

// =============================================================================
// GEOMETRY TYPES
// =============================================================================

// Common geometric types
export interface D3Point {
  x: number;
  y: number;
}

export interface D3Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface D3Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// =============================================================================
// TOOLTIP TYPES
// =============================================================================

export type TooltipSelection = HTMLDivSelection;

// =============================================================================
// FORCE SIMULATION NODE TYPES
// =============================================================================

export interface D3SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface D3SimulationLink<T extends D3SimulationNode> extends d3.SimulationLinkDatum<T> {
  source: T | string;
  target: T | string;
} 