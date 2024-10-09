type ColorList = [
  // Node colors
  { name: "node.default"; hex: string },
  { name: "node.entry"; hex: string },
  { name: "node.exit"; hex: string },
  { name: "node.throw"; hex: string },
  { name: "node.yield"; hex: string },
  { name: "node.border"; hex: string },
  { name: "node.highlight"; hex: string },

  // Edge Colors
  { name: "edge.regular"; hex: string },
  { name: "edge.consequence"; hex: string },
  { name: "edge.alternative"; hex: string },

  // Cluster Colors
  { name: "cluster.border"; hex: string },
  { name: "cluster.with"; hex: string },
  { name: "cluster.tryComplex"; hex: string },
  { name: "cluster.try"; hex: string },
  { name: "cluster.finally"; hex: string },
  { name: "cluster.except"; hex: string },

  // Graph Colors
  { name: "graph.background"; hex: string },
];
export type Color = ColorList[number];

const defaultColorList: ColorList = [
  // Node colors
  { name: "node.default", hex: "#d3d3d3" },
  { name: "node.entry", hex: "#48AB30" },
  { name: "node.exit", hex: "#AB3030" },
  { name: "node.throw", hex: "#ffdddd" },
  { name: "node.yield", hex: "#00bfff" },
  { name: "node.border", hex: "#000000" },
  { name: "node.highlight", hex: "#000000" },

  // Edge Colors
  { name: "edge.regular", hex: "#0000ff" },
  { name: "edge.consequence", hex: "#008000" },
  { name: "edge.alternative", hex: "#ff0000" },

  // Cluster Colors
  { name: "cluster.border", hex: "#ffffff" },
  { name: "cluster.with", hex: "#ffddff" },
  { name: "cluster.tryComplex", hex: "#ddddff" },
  { name: "cluster.try", hex: "#ddffdd" },
  { name: "cluster.finally", hex: "#ffffdd" },
  { name: "cluster.except", hex: "#ffdddd" },

  // Graph Colors
  { name: "graph.background", hex: "#ffffff" },
];
const darkColorList: ColorList = [
  { name: "node.default", hex: "#707070" },
  { name: "node.entry", hex: "#48AB30" },
  { name: "node.exit", hex: "#AB3030" },
  { name: "node.throw", hex: "#590c0c" },
  { name: "node.yield", hex: "#0a9aca" },
  { name: "node.border", hex: "#000000" },
  { name: "node.highlight", hex: "#dddddd" },
  { name: "edge.regular", hex: "#2592a1" },
  { name: "edge.consequence", hex: "#4ce34c" },
  { name: "edge.alternative", hex: "#ff3e3e" },
  { name: "cluster.border", hex: "#302e2e" },
  { name: "cluster.with", hex: "#7d007d" },
  { name: "cluster.tryComplex", hex: "#344c74" },
  { name: "cluster.try", hex: "#1b5f1b" },
  { name: "cluster.finally", hex: "#999918" },
  { name: "cluster.except", hex: "#590c0c" },
  { name: "graph.background", hex: "#1e1e1e" },
];

export type ColorScheme = Record<ColorList[number]["name"], string>;
export function listToScheme(colors: ColorList): ColorScheme {
  const scheme = {} as ColorScheme;
  for (const { name, hex } of colors) {
    scheme[name] = hex;
  }
  return scheme;
}

const defaultColorScheme = listToScheme(defaultColorList);

export function getDefaultColorList(): ColorList {
  return structuredClone(defaultColorList);
}

export function getDarkColorList(): ColorList {
  return structuredClone(darkColorList);
}

export function getDefaultColorScheme(): ColorScheme {
  return structuredClone(defaultColorScheme);
}

export function serializeColorList(colorList: ColorList): string {
  return JSON.stringify({ version: 1, scheme: colorList });
}

export function deserializeColorList(data: string): ColorList {
  const { version, scheme } = JSON.parse(data);
  if (version !== 1) {
    throw new Error(`Invalid scheme version: ${version}`);
  }
  for (const { hex } of scheme) {
    if (!hex.match(/^#[0-9a-fA-F]+$/)) {
      throw new Error(`Invalid color: ${hex}`);
    }
  }
  return scheme;
}
