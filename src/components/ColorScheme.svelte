<script lang="ts">
  import ColorPicker from "svelte-awesome-color-picker";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  const colorScheme = [
    // Node colors
    { name: "node.default", label: "Default", hex: "#d3d3d3" },
    { name: "node.entry", label: "Entry", hex: "#48AB30" },
    { name: "node.exit", label: "Exit", hex: "#AB3030" },
    { name: "node.throw", label: "Throw", hex: "#ffdddd" },
    { name: "node.yield", label: "Yield", hex: "#00bfff" },
    { name: "node.border", label: "Border", hex: "#000000" },
    { name: "node.highlight", label: "Highlight", hex: "#000000" },

    // Edge Colors
    { name: "edge.regular", label: "Regular", hex: "#0000ff" },
    { name: "edge.consequence", label: "Consequence", hex: "#008000" },
    { name: "edge.alternative", label: "Alternative", hex: "#ff0000" },

    // Cluster Colors
    { name: "cluster.border", label: "Border", hex: "#ffffff" },
    { name: "cluster.with", label: "With", hex: "#ffddff" },
    { name: "cluster.tryComplex", label: "Try Complex", hex: "#ddddff" },
    { name: "cluster.try", label: "Try", hex: "#ddffdd" },
    { name: "cluster.finally", label: "Finally", hex: "#ffffdd" },
    { name: "cluster.except", label: "Except", hex: "#ffdddd" },

    // Graph Colors
    { name: "graph.background", label: "Background", hex: "#00000000" },
  ];

  const groups = ["Node", "Edge", "Cluster", "Graph"] as const;

  function colorsFor(entity: (typeof groups)[number]) {
    return colorScheme.filter(({ name }) =>
      name.startsWith(entity.toLowerCase()),
    );
  }

  let configInput;
  function onColorChange(color) {
    return (event) => {
      color.hex = event.detail.hex ?? color.hex;
      dispatch("color", { colors: colorScheme });
      // console.log(configInput);
      if (configInput) {
        configInput.value = JSON.stringify(colorScheme);
      }
    };
  }
</script>

{#each groups as group}
  <fieldset>
    <legend>{group}</legend>
    <div class="colors">
      {#each colorsFor(group) as color (color.name)}
        <span>{color.label}</span>
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
  <input type="text" bind:this={configInput} />
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
