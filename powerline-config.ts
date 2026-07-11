import { visibleWidth } from "@earendil-works/pi-tui";
import type {
  BuiltinStatusLineSegmentId,
  ColorValue,
  CustomItemPosition,
  CustomStatusItem,
  PresetDef,
  StatusLinePreset,
  StatusLineSegmentId,
  StatusLineSegmentOptions,
  StatusLineSeparatorStyle,
} from "./types.ts";

export type PowerlineWidgetPlacement = "aboveEditor" | "belowEditor";

export interface PowerlineSegmentLayout {
  left?: BuiltinStatusLineSegmentId[];
  right?: BuiltinStatusLineSegmentId[];
  secondary?: BuiltinStatusLineSegmentId[];
}

export interface PowerlineConfig {
  preset: StatusLinePreset;
  separator?: StatusLineSeparatorStyle;
  layout?: PowerlineSegmentLayout;
  primaryPlacement: PowerlineWidgetPlacement;
  secondaryPlacement: PowerlineWidgetPlacement;
  customItems: CustomStatusItem[];
  hiddenStatusKeys: string[];
  hiddenSegments: BuiltinStatusLineSegmentId[];
  segmentOptions: StatusLineSegmentOptions;
  mouseScroll: boolean;
  fixedEditor: boolean;
  compactEditorGap: boolean;
  welcome: boolean;
  stashSharpSShortcut: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SEPARATOR_STYLES = new Set<StatusLineSeparatorStyle>([
  "powerline", "powerline-thin", "slash", "pipe", "block",
  "none", "ascii", "dot", "chevron", "star",
]);

const BUILTIN_SEGMENTS = new Set<BuiltinStatusLineSegmentId>([
  "model", "shell_mode", "path", "git", "subagents", "token_in",
  "token_out", "token_total", "cost", "context_pct", "context_total",
  "time_spent", "time", "session", "hostname", "cache_read",
  "cache_write", "thinking", "extension_statuses",
]);

function normalizeSeparator(value: unknown): StatusLineSeparatorStyle | undefined {
  return typeof value === "string" && SEPARATOR_STYLES.has(value as StatusLineSeparatorStyle)
    ? value as StatusLineSeparatorStyle
    : undefined;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean))];
}

function normalizeHiddenSegments(value: unknown): BuiltinStatusLineSegmentId[] {
  return normalizeStringList(value).filter((entry): entry is BuiltinStatusLineSegmentId =>
    BUILTIN_SEGMENTS.has(entry as BuiltinStatusLineSegmentId),
  );
}

function normalizeSegmentLayout(value: unknown): PowerlineSegmentLayout | undefined {
  if (!isRecord(value)) return undefined;

  const layout: PowerlineSegmentLayout = {};
  if (Array.isArray(value.left)) layout.left = normalizeHiddenSegments(value.left);
  if (Array.isArray(value.right)) layout.right = normalizeHiddenSegments(value.right);
  if (Array.isArray(value.secondary)) layout.secondary = normalizeHiddenSegments(value.secondary);

  return Object.keys(layout).length > 0 ? layout : undefined;
}

function normalizeWidgetPlacement(
  value: unknown,
  fallback: PowerlineWidgetPlacement,
 ): PowerlineWidgetPlacement {
  if (value === "above" || value === "aboveEditor") return "aboveEditor";
  if (value === "below" || value === "belowEditor") return "belowEditor";
  return fallback;
}

function normalizePreset(value: unknown, presets: readonly StatusLinePreset[]): StatusLinePreset | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return (presets as readonly string[]).includes(normalized) ? (normalized as StatusLinePreset) : null;
}

function normalizeCustomItemId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return /^[a-zA-Z0-9_-]+$/.test(normalized) ? normalized : null;
}

function normalizeCustomItemPosition(value: unknown): CustomItemPosition {
  if (value === "left" || value === "right" || value === "secondary") return value;
  return "right";
}

function normalizeCustomColor(value: unknown): ColorValue | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? (normalized as ColorValue) : undefined;
}

function normalizeCustomPrefix(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeCustomStatusItem(raw: unknown, idOverride?: string): CustomStatusItem | null {
  if (!isRecord(raw)) return null;
  const id = normalizeCustomItemId(idOverride ?? raw.id);
  if (!id) return null;

  const statusKey = typeof raw.statusKey === "string" && raw.statusKey.trim() ? raw.statusKey.trim() : id;

  return {
    id,
    statusKey,
    position: normalizeCustomItemPosition(raw.position),
    color: normalizeCustomColor(raw.color),
    prefix: normalizeCustomPrefix(raw.prefix),
    hideWhenMissing: raw.hideWhenMissing !== false,
    excludeFromExtensionStatuses: raw.excludeFromExtensionStatuses !== false,
  };
}

function normalizeCustomItems(raw: unknown): CustomStatusItem[] {
  const normalized: CustomStatusItem[] = [];

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const item = normalizeCustomStatusItem(entry);
      if (item) normalized.push(item);
    }
  } else if (isRecord(raw)) {
    for (const [id, entry] of Object.entries(raw)) {
      const item = normalizeCustomStatusItem(entry, id);
      if (item) normalized.push(item);
    }
  }

  const deduped = new Map<string, CustomStatusItem>();
  for (const item of normalized) {
    deduped.set(item.id, item);
  }

  return [...deduped.values()];
}

function normalizeSegmentOptions(raw: Record<string, unknown>): StatusLineSegmentOptions {
  const options: StatusLineSegmentOptions = {};

  if (isRecord(raw.model)) {
    options.model = {
      ...(typeof raw.model.showThinkingLevel === "boolean" ? { showThinkingLevel: raw.model.showThinkingLevel } : {}),
      ...(raw.model.display === "name" || raw.model.display === "qualified" ? { display: raw.model.display } : {}),
      ...(raw.model.thinkingDisplay === "detailed" || raw.model.thinkingDisplay === "parenthesized"
        ? { thinkingDisplay: raw.model.thinkingDisplay }
        : {}),
    };
  }

  if (isRecord(raw.path)) {
    options.path = {
      ...(raw.path.mode === "basename" || raw.path.mode === "abbreviated" || raw.path.mode === "full" ? { mode: raw.path.mode } : {}),
      ...(typeof raw.path.maxLength === "number" && Number.isFinite(raw.path.maxLength) && raw.path.maxLength > 0
        ? { maxLength: Math.floor(raw.path.maxLength) }
        : {}),
    };
  }

  if (isRecord(raw.git)) {
    options.git = {
      ...(typeof raw.git.showBranch === "boolean" ? { showBranch: raw.git.showBranch } : {}),
      ...(typeof raw.git.showStaged === "boolean" ? { showStaged: raw.git.showStaged } : {}),
      ...(typeof raw.git.showUnstaged === "boolean" ? { showUnstaged: raw.git.showUnstaged } : {}),
      ...(typeof raw.git.showUntracked === "boolean" ? { showUntracked: raw.git.showUntracked } : {}),
      ...(raw.git.polling === "full" || raw.git.polling === "branch" || raw.git.polling === "off" ? { polling: raw.git.polling } : {}),
    };
  }

  if (isRecord(raw.time)) {
    options.time = {
      ...(raw.time.format === "12h" || raw.time.format === "24h" ? { format: raw.time.format } : {}),
      ...(typeof raw.time.showSeconds === "boolean" ? { showSeconds: raw.time.showSeconds } : {}),
    };
  }

  if (isRecord(raw.cost)) {
    options.cost = {
      ...(raw.cost.subscriptionDisplay === "subscription"
        || raw.cost.subscriptionDisplay === "reported-cost"
        || raw.cost.subscriptionDisplay === "both"
        ? { subscriptionDisplay: raw.cost.subscriptionDisplay }
        : {}),
    };
  }

  if (isRecord(raw.context)) {
    const contextColor = normalizeCustomColor(raw.context.color);
    options.context = {
      ...(contextColor ? { color: contextColor } : {}),
      ...(typeof raw.context.showAutoCompact === "boolean"
        ? { showAutoCompact: raw.context.showAutoCompact }
        : {}),
      ...(typeof raw.context.showIcon === "boolean"
        ? { showIcon: raw.context.showIcon }
        : {}),
      ...(typeof raw.context.decimalPlaces === "number"
        && Number.isFinite(raw.context.decimalPlaces)
        && raw.context.decimalPlaces >= 0
        && raw.context.decimalPlaces <= 3
        ? { decimalPlaces: Math.floor(raw.context.decimalPlaces) }
        : {}),
      ...(raw.context.display === "full" || raw.context.display === "percent"
        ? { display: raw.context.display }
        : {}),
    };
  }

  return options;
}

export function mergeSegmentOptions(
  defaults: StatusLineSegmentOptions = {},
  overrides: StatusLineSegmentOptions = {},
): StatusLineSegmentOptions {
  return {
    ...defaults,
    ...overrides,
    model: { ...defaults.model, ...overrides.model },
    path: { ...defaults.path, ...overrides.path },
    git: { ...defaults.git, ...overrides.git },
    time: { ...defaults.time, ...overrides.time },
    cost: { ...defaults.cost, ...overrides.cost },
    ...(defaults.context || overrides.context
      ? { context: { ...defaults.context, ...overrides.context } }
      : {}),
  };
}

export function parsePowerlineConfig(value: unknown, presets: readonly StatusLinePreset[]): PowerlineConfig {
  const defaultConfig: PowerlineConfig = {
    preset: "default",
    separator: undefined,
    layout: undefined,
    primaryPlacement: "aboveEditor",
    secondaryPlacement: "belowEditor",
    customItems: [],
    hiddenStatusKeys: [],
    hiddenSegments: [],
    segmentOptions: {},
    mouseScroll: true,
    fixedEditor: true,
    compactEditorGap: false,
    welcome: true,
    stashSharpSShortcut: false,
  };

  const directPreset = normalizePreset(value, presets);
  if (directPreset) return { ...defaultConfig, preset: directPreset };

  if (!isRecord(value)) return defaultConfig;

  const placement = isRecord(value.placement) ? value.placement : {};
  return {
    preset: normalizePreset(value.preset, presets) ?? defaultConfig.preset,
    separator: normalizeSeparator(value.separator),
    layout: normalizeSegmentLayout(value.layout),
    primaryPlacement: normalizeWidgetPlacement(placement.primary, defaultConfig.primaryPlacement),
    secondaryPlacement: normalizeWidgetPlacement(placement.secondary, defaultConfig.secondaryPlacement),
    customItems: normalizeCustomItems(value.customItems),
    hiddenStatusKeys: normalizeStringList(value.hiddenStatusKeys),
    hiddenSegments: normalizeHiddenSegments(value.hiddenSegments),
    segmentOptions: normalizeSegmentOptions(value),
    mouseScroll: value.mouseScroll !== false,
    fixedEditor: value.fixedEditor !== false,
    compactEditorGap: value.compactEditorGap === true,
    welcome: value.welcome !== false,
    stashSharpSShortcut: value.stashSharpSShortcut === true,
  };
}

export function mergeSegmentsWithCustomItems(
  presetDef: PresetDef,
  customItems: readonly CustomStatusItem[],
  hiddenSegments: ReadonlySet<BuiltinStatusLineSegmentId> = new Set(),
  layout?: PowerlineSegmentLayout,
): {
  leftSegments: StatusLineSegmentId[];
  rightSegments: StatusLineSegmentId[];
  secondarySegments: StatusLineSegmentId[];
} {
  const seen = new Set<BuiltinStatusLineSegmentId>();
  const visible = (segment: BuiltinStatusLineSegmentId) => {
    if (hiddenSegments.has(segment) || seen.has(segment)) return false;
    seen.add(segment);
    return true;
  };
  const left: StatusLineSegmentId[] = (layout?.left ?? presetDef.leftSegments).filter(visible);
  const right: StatusLineSegmentId[] = (layout?.right ?? presetDef.rightSegments).filter(visible);
  const secondary: StatusLineSegmentId[] = (layout?.secondary ?? presetDef.secondarySegments ?? []).filter(visible);

  for (const item of customItems) {
    const segmentId: StatusLineSegmentId = `custom:${item.id}`;
    if (item.position === "left") left.push(segmentId);
    else if (item.position === "secondary") secondary.push(segmentId);
    else right.push(segmentId);
  }

  return { leftSegments: left, rightSegments: right, secondarySegments: secondary };
}

export function nextPowerlineSettingWithPreset(existingPowerlineSetting: unknown, preset: StatusLinePreset): unknown {
  if (!isRecord(existingPowerlineSetting)) {
    return preset;
  }
  return { ...existingPowerlineSetting, preset };
}

export function nextPowerlineSettingWithOptions(
  existingPowerlineSetting: unknown,
  updates: Partial<Pick<PowerlineConfig, "mouseScroll" | "fixedEditor" | "welcome" | "stashSharpSShortcut">>,
  currentPreset: StatusLinePreset,
): unknown {
  if (!isRecord(existingPowerlineSetting)) {
    return { preset: currentPreset, ...updates };
  }
  return { ...existingPowerlineSetting, ...updates };
}

export function collectHiddenExtensionStatusKeys(
  customItems: readonly CustomStatusItem[],
  hiddenStatusKeys: readonly string[] = [],
): Set<string> {
  const hidden = new Set(hiddenStatusKeys);
  for (const item of customItems) {
    if (item.excludeFromExtensionStatuses) hidden.add(item.statusKey);
  }
  return hidden;
}

export function isNotificationExtensionStatus(value: string): boolean {
  return value.trimStart().startsWith("[");
}

export function getNotificationExtensionStatuses(
  statuses: ReadonlyMap<string, string>,
  hiddenKeys: ReadonlySet<string>,
): string[] {
  const notifications: string[] = [];
  for (const [statusKey, value] of statuses.entries()) {
    if (hiddenKeys.has(statusKey) || !value || !isNotificationExtensionStatus(value)) {
      continue;
    }
    notifications.push(value);
  }
  return notifications;
}

export function normalizeExtensionStatusValue(value: string): string | null {
  if (!value || visibleWidth(value) <= 0) {
    return null;
  }

  const stripped = value.replace(/(\x1b\[[0-9;]*m|\s|·|[|])+$/, "");
  return visibleWidth(stripped) > 0 ? stripped : null;
}

export function normalizeCompactExtensionStatus(value: string): string | null {
  if (isNotificationExtensionStatus(value)) {
    return null;
  }

  return normalizeExtensionStatusValue(value);
}
