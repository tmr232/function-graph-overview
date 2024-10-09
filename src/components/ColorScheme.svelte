<script lang="ts">
  import ColorPicker from "svelte-awesome-color-picker";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  const defaultColorScheme = [
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
    { name: "graph.background", hex: "#00000000" },
  ] as const;

  let colorScheme = structuredClone(defaultColorScheme);

  const colorLabels = new Map([
    ["node.default", "Default"],
    ["node.entry", "Entry"],
    ["node.exit", "Exit"],
    ["node.throw", "Throw"],
    ["node.yield", "Yield"],
    ["node.border", "Border"],
    ["node.highlight", "Highlight"],
    ["edge.regular", "Regular"],
    ["edge.consequence", "Consequence"],
    ["edge.alternative", "Alternative"],
    ["cluster.border", "Border"],
    ["cluster.with", "With"],
    ["cluster.tryComplex", "Try Complex"],
    ["cluster.try", "Try"],
    ["cluster.finally", "Finally"],
    ["cluster.except", "Except"],
    ["graph.background", "Background"],
  ]) as const;

  const groups = ["Node", "Edge", "Cluster", "Graph"] as const;

  function colorsFor(
    scheme: typeof defaultColorScheme,
    entity: (typeof groups)[number],
  ) {
    return scheme.filter(({ name }) => name.startsWith(entity.toLowerCase()));
  }

  function serializeColorScheme(
    scheme: { name: string; hex: string }[],
  ): string {
    return JSON.stringify({ version: 1, scheme });
  }

  function deserializeColorScheme(data: string) {
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

  function onColorChange(color) {
    return (event) => {
      color.hex = event.detail.hex ?? color.hex;
      dispatch("color", { colors: colorScheme });
    };
  }

  async function copyScheme() {
    await navigator.clipboard.writeText(serializeColorScheme(colorScheme));
  }
  async function pasteScheme() {
    const newScheme = deserializeColorScheme(
      await navigator.clipboard.readText(),
    );
    colorScheme = newScheme;
  }
  function resetScheme() {
    colorScheme = structuredClone(defaultColorScheme);
  }
  function applyScheme() {}
</script>

{#each groups as group}
  <fieldset>
    <legend>{group}</legend>
    <div class="colors">
      {#each colorsFor(colorScheme, group) as color (color.name)}
        <span>{colorLabels.get(color.name)}</span>
        <div class="border">
          <ColorPicker
            hex={color.hex}
            on:input={onColorChange(color)}
            position="responsive"
            label=""
            name={color.name}
          />
        </div>
      {/each}
    </div>
  </fieldset>
{/each}
<fieldset>
  <legend>As Text</legend>
  <button on:click={copyScheme}>Copy</button>
  <button on:click={pasteScheme}>Paste</button>
  <button on:click={resetScheme}>Reset</button>
  <button on:click={applyScheme}>Apply</button>
</fieldset>

<style>
  .border {
    border: 1px solid black;
    border-radius: 100%;
    width: fit-content;
    margin: 0px;
    padding: 0px;
  }

  .colors {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
</style>
