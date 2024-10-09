const defaultColorList = [
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
] as const;

export type ColorList = typeof defaultColorList;
export type Color = { name: ColorList[number]["name"]; hex: `#${string}` };
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

// Nice schemes
/*
Dark mode - {"version":1,"scheme":[{"name":"node.default","hex":"#707070"},{"name":"node.entry","hex":"#48AB30"},{"name":"node.exit","hex":"#AB3030"},{"name":"node.throw","hex":"#ffdddd"},{"name":"node.yield","hex":"#00bfff"},{"name":"node.border","hex":"#000000"},{"name":"node.highlight","hex":"#dddddd"},{"name":"edge.regular","hex":"#2592a1"},{"name":"edge.consequence","hex":"#4ce34c"},{"name":"edge.alternative","hex":"#ff3e3e"},{"name":"cluster.border","hex":"#ffffff"},{"name":"cluster.with","hex":"#ffddff"},{"name":"cluster.tryComplex","hex":"#ddddff"},{"name":"cluster.try","hex":"#ddffdd"},{"name":"cluster.finally","hex":"#ffffdd"},{"name":"cluster.except","hex":"#ffdddd"},{"name":"graph.background","hex":"#302e2e"}]}
*/
