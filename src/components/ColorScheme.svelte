<script lang="ts">
  import ColorPicker from "svelte-awesome-color-picker";
  import { createEventDispatcher } from "svelte";
  import {
    getDefaultColorList,
    serializeColorList,
    deserializeColorList,
    type ColorList,
    type Color,
  } from "../control-flow/colors";
  const dispatch = createEventDispatcher();

  export let colorList = getDefaultColorList();

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
  ]);

  const groups = ["Node", "Edge", "Cluster", "Graph"] as const;

  function colorsFor(colors: ColorList, entity: (typeof groups)[number]) {
    return colors.filter(({ name }) => name.startsWith(entity.toLowerCase()));
  }

  function onColorChange(color: Color) {
    return (event) => {
      color.hex = event.detail.hex ?? color.hex;
      dispatch("preview", { colors: colorList });
    };
  }

  async function copyList() {
    await navigator.clipboard.writeText(serializeColorList(colorList));
  }
  async function pasteList() {
    const newColors = deserializeColorList(
      await navigator.clipboard.readText(),
    );
    colorList = newColors;
  }
  function resetList() {
    colorList = getDefaultColorList();
  }
</script>

<div class="wrapper">
  <div class="main">
    <fieldset>
      <legend>Controls</legend>
      <div class="controls">
        <button on:click={copyList} title="Copy color scheme to clipboard"
          >Copy</button
        >
        <button on:click={pasteList} title="Paste color scheme from clipboard"
          >Paste</button
        >
        <button on:click={resetList} title="Reset color scheme to defaults"
          >Reset</button
        >
      </div>
    </fieldset>
    {#each groups as group}
      <fieldset>
        <legend>{group}</legend>
        <div class="colors">
          {#each colorsFor(colorList, group) as color (color.name)}
            <span class="label">{colorLabels.get(color.name)}</span>
            <div class="border dark">
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
  </div>
</div>

<style>
  .wrapper {
    display: flex;
    justify-content: center;
    margin-top: 3rem;
  }
  .label {
    align-self: center;
  }
  .main {
    width: fit-content;
  }
  .border {
    border: 1px solid light-dark(black, white);
    border-radius: 100%;
    width: fit-content;
    margin: 0px;
    padding: 0px;
  }

  .colors {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.3rem;
  }

  .controls {
    display: flex;
    gap: 1em;
  }

  .dark {
    --cp-bg-color: #333;
    --cp-border-color: white;
    --cp-text-color: white;
    --cp-input-color: #555;
    --cp-button-hover-color: #777;
  }
</style>
