export const COLORS = {
  cluster: {
    border: "white",
    with: "#ffddff",
    tryComplex: "#ddddff",
    try: "#ddffdd",
    finally: "#ffffdd",
    except: "#ffdddd",
  },
  edge: {
    regular: "blue",
    consequence: "green",
    alternative: "red",
  },
  node: {
    default: "lightgray",
    entry: "#48AB30",
    exit: "#AB3030",
    throw: "#fdd",
    yield: "deepskyblue",
    highlight: "black",
    border: "black",
  },
  graph: {
    background: "transparent",
  },
  renderError: "fuschsia",
} as const;
