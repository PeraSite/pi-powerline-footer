import test from "node:test";
import assert from "node:assert/strict";
import { installCompactEditorGap } from "../editor-gap.ts";

test("compact editor gap removes only Pi's leading empty spacer", () => {
  const editor = {};
  const above = { render: () => ["", "widget"] };
  const tui = {
    children: [
      { render: () => ["chat"] },
      above,
      { children: [editor], render: () => ["editor"] },
    ],
  };

  const restore = installCompactEditorGap(tui, editor);
  assert.deepEqual(above.render(), ["widget"]);

  restore();
  assert.deepEqual(above.render(), ["", "widget"]);
});

test("compact editor gap preserves non-empty leading widget lines", () => {
  const editor = {};
  const above = { render: () => ["widget"] };
  const tui = { children: [above, { children: [editor] }] };

  const restore = installCompactEditorGap(tui, editor);
  assert.deepEqual(above.render(), ["widget"]);
  restore();
});
