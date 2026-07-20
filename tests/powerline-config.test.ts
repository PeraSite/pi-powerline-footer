import test from "node:test";
import assert from "node:assert/strict";
import { collectHiddenExtensionStatusKeys, mergeSegmentsWithCustomItems, parsePowerlineConfig } from "../powerline-config.ts";
import { getPreset } from "../presets.ts";

const presets = ["default", "minimal", "compact", "full", "nerd", "ascii", "custom"] as const;

test("parses display overrides and ignores invalid values", () => {
  const config = parsePowerlineConfig({
    preset: "default",
    separator: "none",
    placement: { primary: "below", secondary: "above" },
    layout: {
      left: ["path", "git"],
      right: ["model", "thinking", "context_pct", "cost"],
      secondary: [],
    },
    hiddenStatusKeys: ["mcp", " pi-lens-lsp ", "mcp", 42],
    hiddenSegments: ["cache_read", "not-a-segment"],
    context: { color: "accent", showAutoCompact: false, showIcon: true, decimalPlaces: 0, display: "remaining-percent" },
    mouseScrollLines: 1,
    showScrollAwayNavigationCard: false,
    compactEditorGap: true,
  }, presets);

  assert.equal(config.separator, "none");
  assert.equal(config.primaryPlacement, "belowEditor");
  assert.equal(config.secondaryPlacement, "aboveEditor");
  assert.equal(config.mouseScrollLines, 1);
  assert.equal(config.showScrollAwayNavigationCard, false);
  assert.equal(config.compactEditorGap, true);
  assert.deepEqual(config.layout, {
    left: ["path", "git"],
    right: ["model", "thinking", "context_pct", "cost"],
    secondary: [],
  });
  assert.deepEqual(config.hiddenStatusKeys, ["mcp", "pi-lens-lsp"]);
  assert.deepEqual(config.hiddenSegments, ["cache_read"]);
  assert.deepEqual(config.segmentOptions.context, {
    color: "accent",
    showAutoCompact: false,
    showIcon: true,
    decimalPlaces: 0,
    display: "remaining-percent",
  });
});

test("removes hidden built-in segments while retaining custom items", () => {
  const merged = mergeSegmentsWithCustomItems(
    getPreset("default"),
    [{
      id: "quota",
      statusKey: "pi-quotas-usage",
      position: "right",
      hideWhenMissing: true,
      excludeFromExtensionStatuses: true,
    }],
    new Set(["cache_read"]),
  );

  assert.equal(merged.leftSegments.includes("cache_read"), false);
  assert.equal(merged.rightSegments.includes("custom:quota"), true);
});

test("layout overrides let each built-in segment choose its row and side", () => {
  const merged = mergeSegmentsWithCustomItems(
    getPreset("default"),
    [],
    new Set(),
    {
      left: ["path", "git"],
      right: ["model", "thinking", "context_pct", "cost"],
      secondary: [],
    },
  );

  assert.deepEqual(merged.leftSegments, ["path", "git"]);
  assert.deepEqual(merged.rightSegments, ["model", "thinking", "context_pct", "cost"]);
  assert.deepEqual(merged.secondarySegments, []);
});

test("combines explicitly hidden and promoted extension status keys", () => {
  const hidden = collectHiddenExtensionStatusKeys(
    [{
      id: "quota",
      statusKey: "pi-quotas-usage",
      position: "right",
      hideWhenMissing: true,
      excludeFromExtensionStatuses: true,
    }],
    ["mcp", "pi-lens-lsp"],
  );

  assert.deepEqual([...hidden], ["mcp", "pi-lens-lsp", "pi-quotas-usage"]);
});
