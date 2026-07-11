type Renderable = {
  render: (...args: unknown[]) => unknown;
};

function hasChild(container: unknown, child: unknown): boolean {
  if (typeof container !== "object" || container === null) return false;
  const children = Reflect.get(container, "children");
  return Array.isArray(children) && children.includes(child);
}

/**
 * Remove Pi's built-in empty spacer immediately above the editor without
 * patching the Pi installation itself.
 */
export function installCompactEditorGap(tui: unknown, editor: unknown): () => void {
  if (typeof tui !== "object" || tui === null || !editor) return () => {};

  const rootChildren = Reflect.get(tui, "children");
  if (!Array.isArray(rootChildren)) return () => {};

  const editorContainerIndex = rootChildren.findIndex((candidate) => hasChild(candidate, editor));
  if (editorContainerIndex < 1) return () => {};

  const aboveContainer = rootChildren[editorContainerIndex - 1] as Renderable | undefined;
  if (!aboveContainer || typeof aboveContainer.render !== "function") return () => {};

  const originalRender = aboveContainer.render;
  const compactRender = function (this: Renderable, ...args: unknown[]): unknown {
    const rendered = originalRender.apply(this, args);
    if (!Array.isArray(rendered) || rendered[0] !== "") return rendered;
    return rendered.slice(1);
  };

  aboveContainer.render = compactRender;

  return () => {
    if (aboveContainer.render === compactRender) {
      aboveContainer.render = originalRender;
    }
  };
}
