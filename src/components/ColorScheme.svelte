<script lang="ts">
  import ColorPicker from "svelte-awesome-color-picker";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  const colorScheme = [
    { name: "node.default", hex: "#d3d3d3" },
    { name: "node.entry", hex: "#48AB30" },
    { name: "node.exit", hex: "#AB3030" },
  ];
</script>

{#each colorScheme as color (color.name)}
  <ColorPicker
    hex={color.hex}
    on:input={(event) => {
      color.hex = event.detail.hex;
      dispatch("color", { colors: colorScheme });
    }}
    position="responsive"
    label=""
  />
{/each}
