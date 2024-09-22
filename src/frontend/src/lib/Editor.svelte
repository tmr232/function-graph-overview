<script lang="ts">
  import type { LanguageSupport } from "@codemirror/language";
  import { EditorSelection } from "@codemirror/state";
  import type { EditorView } from "@codemirror/view";
  import { createEventDispatcher } from "svelte";
  import CodeMirror from "svelte-codemirror-editor";
  export let code: string;
  export let lang: LanguageSupport;

  let editorView: EditorView;
  let cursorPos: { row: number; column: number; index: number };

  const dispatch = createEventDispatcher();

  export function goto(row: number, column: number = 0) {
    if (!editorView) return;
    const pos = editorView.state.doc.line(row + 1).from + column;
    editorView.dispatch({
      selection: EditorSelection.create([EditorSelection.cursor(pos)]),
    });
    // TODO: actually enable this, once we fix the node mapping.
    // updateCursorPosition();
  }

  function updateCursorPosition() {
    const pos = editorView.state.selection.main.head;
    let { number, from } = editorView.state.doc.lineAt(pos);
    const newCursorPos = { row: number - 1, column: pos - from, index: pos };

    if (
      !cursorPos ||
      cursorPos.row !== newCursorPos.row ||
      cursorPos.column !== newCursorPos.column
    ) {
      dispatch("cursorMoved", { pos: newCursorPos });
    }
    cursorPos = newCursorPos;
  }

  function onEditorReady(event) {
    editorView = event.detail;

    editorView.dom.addEventListener("keyup", updateCursorPosition);
    editorView.dom.addEventListener("mouseup", updateCursorPosition);
  }
</script>

<CodeMirror
  bind:value={code}
  {lang}
  tabSize={4}
  lineWrapping={true}
  on:ready={onEditorReady}
/>
