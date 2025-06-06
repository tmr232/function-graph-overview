<script lang="ts">
import { createEventDispatcher } from "svelte";
import ColorPicker from "svelte-awesome-color-picker";
import {
  type Color,
  type ColorList,
  deserializeColorList,
  getLightColorList,
  serializeColorList,
} from "../control-flow/colors";
const dispatch = createEventDispatcher();

interface Props {
  colorList?: ColorList;
}

let { colorList = $bindable(getLightColorList()) }: Props = $props();

const colorLabels = new Map([
  ["node.default", "Default"],
  ["node.entry", "Entry"],
  ["node.exit", "Exit"],
  ["node.throw", "Throw"],
  ["node.yield", "Yield"],
  ["node.terminate", "Terminate"],
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
    color.hex = event.hex ?? color.hex;
    dispatch("preview", { colors: colorList });
  };
}

async function copyList() {
  await navigator.clipboard.writeText(serializeColorList(colorList));
}
async function pasteList() {
  const newColors = deserializeColorList(await navigator.clipboard.readText());
  colorList = newColors;
}
function resetList() {
  colorList = getLightColorList();
}
</script>

<div class="wrapper">
  <div class="main">
    <fieldset>
      <legend>Controls</legend>
      <div class="controls">
        <button onclick={copyList} title="Copy color scheme to clipboard"
          >Copy</button
        >
        <button onclick={pasteList} title="Paste color scheme from clipboard"
          >Paste</button
        >
        <button onclick={resetList} title="Reset color scheme to defaults"
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
            <div class="border">
              <ColorPicker
                hex={color.hex}
                isAlpha={false}
                onInput={onColorChange(color)}
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
  }
  .label {
    align-self: center;
  }
  .main {
    width: fit-content;
      display: flex;
      flex-direction: column;
      gap: 1rem;
  }
  .border {
    border: 1px solid var(--color-picker-border);
    border-radius: 100%;
    width: fit-content;
    margin: 0;
    padding: 0;
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
</style>
