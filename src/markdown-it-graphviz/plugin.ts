import { Graphviz } from "@hpcc-js/wasm-graphviz";
import type markdownit from "markdown-it";
import {
  type ColorScheme,
  getDarkColorScheme,
  getLightColorScheme,
} from "../control-flow/colors.ts";
import { applyTheme } from "../dot-cfg/dot-print.ts";

export type Config = {
  customCss?: {
    darkClass: string;
    lightClass: string;
  };

  darkMode?: boolean;
};

export async function GraphvizDotPlugin() {
  const graphviz = await Graphviz.load();
  function renderCfg(
    code: string,
    colorScheme: ColorScheme,
    cssClass?: string,
  ) {
    const themedDot = applyTheme(`digraph { ${code} }`, colorScheme);
    const svg = graphviz.dot(themedDot);
    return `<div class="${cssClass}">${svg}</div>`;
  }

  return (md: markdownit, config?: Config) => {
    // Save the original fence renderer
    const defaultFence = md.renderer.rules.fence;

    // Override the fence renderer
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (!token) {
        return "";
      }

      if (token.info.trim() === "dot") {
        const code = token.content.trim();

        const svg = graphviz.dot(code);

        return `<div class="dot-graph">
                  ${svg}
                </div>`;
      }

      if (token.info.trim() === "dot-cfg") {
        const code = token.content.trim();

        if (config?.customCss) {
          const darkSvg = renderCfg(
            code,
            getDarkColorScheme(),
            config.customCss.darkClass,
          );
          const lightSvg = renderCfg(
            code,
            getLightColorScheme(),
            config.customCss.lightClass,
          );

          return `<div class="dot-graph">
                    ${darkSvg}
                    ${lightSvg}
                  </div>`;
        }

        if (config?.darkMode) {
          return renderCfg(code, getDarkColorScheme());
        }

        return renderCfg(code, getLightColorScheme());
      }

      // For other languages, use the default renderer
      if (!defaultFence) {
        return "";
      }
      return defaultFence(tokens, idx, options, env, self);
    };
  };
}
