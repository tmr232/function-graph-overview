<script lang="ts">
  import ColorPicker from "svelte-awesome-color-picker";
  import { createEventDispatcher } from "svelte";
  import {
    defaultColorList,
    serializeColorList,
    deserializeColorList,
  } from "../control-flow/colors";
  const dispatch = createEventDispatcher();

  let colorScheme = structuredClone(defaultColorList);

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

  function onColorChange(color) {
    return (event) => {
      color.hex = event.detail.hex ?? color.hex;
      dispatch("preview", { colors: colorScheme });
    };
  }

  async function copyScheme() {
    await navigator.clipboard.writeText(serializeColorList(colorScheme));
  }
  async function pasteScheme() {
    const newScheme = deserializeColorList(
      await navigator.clipboard.readText(),
    );
    colorScheme = newScheme;
  }
  function resetScheme() {
    colorScheme = structuredClone(defaultColorList);
  }
  function applyScheme() {
    dispatch("apply", { colors: colorScheme });
  }
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
            isAlpha={false}
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
