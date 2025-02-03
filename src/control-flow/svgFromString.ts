import { SVG, type Svg } from "@svgdotjs/svg.js";

/**
 * Create an SVG object from a string representing an SVG
 * @param rawSvg the SVG string
 */
export function svgFromString(rawSvg: string): Svg {
  const parser = new DOMParser();
  const dom = parser.parseFromString(rawSvg, "image/svg+xml");
  return SVG(dom.documentElement) as Svg;
}
