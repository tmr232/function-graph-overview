<script lang="ts">
  import type { LanguageSupport } from "@codemirror/language";
  import { EditorView } from "@codemirror/view";
  import type { Extension } from "@codemirror/state";
  import { createEventDispatcher } from "svelte";
  import CodeMirror from "svelte-codemirror-editor";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { isDark } from "./lightdark.ts";
  export let code: string;
  export let lang: LanguageSupport;
  export let fontSize: string = "1em";

  let editorView: EditorView;
  let cursorPos: { row: number; column: number; index: number };

  const dispatch = createEventDispatcher();
  const fontSizeTheme = (
    fontSize: string,
    baseTheme?: Extension | undefined,
  ): Extension[] =>
    [EditorView.theme({ "&": { fontSize: fontSize } }), baseTheme].filter(
      (item) => item !== undefined,
    );

  function updateCursorPosition() {
    const pos = editorView.state.selection.main.head;
    let { number, from, to } = editorView.state.doc.lineAt(pos);
    const newCursorPos = {
      row: number - 1,
      column: pos - from,
      // If we're at the end of a line, we decrement the position by 1
      // to make it feel more natural.
      // TODO: Make this consistent.
      index: pos === to ? pos - 1 : pos,
    };

    if (
      !cursorPos ||
      cursorPos.row !== newCursorPos.row ||
      cursorPos.column !== newCursorPos.column
    ) {
      dispatch("cursorMoved", { pos: newCursorPos });
    }
    cursorPos = newCursorPos;
  }

  function onEditorReady(event: { detail: EditorView }) {
    editorView = event.detail;

    editorView.dom.addEventListener("keyup", updateCursorPosition);
    editorView.dom.addEventListener("mouseup", updateCursorPosition);
  }

  export function setCursor(offset: number) {
    if (!editorView) return;
    editorView.dispatch({
      selection: { anchor: offset, head: offset },
      scrollIntoView: true,
    });
  }
</script>

<CodeMirror
  bind:value={code}
  {lang}
  tabSize={4}
  lineWrapping={true}
  on:ready={onEditorReady}
  theme={$isDark ? fontSizeTheme(fontSize, oneDark) : fontSizeTheme(fontSize)}
/>
