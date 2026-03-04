"use client";

import {
  Loader2,
  AlertCircle,
  FilePlus2,
  Pencil,
  Eye,
  RotateCcw,
  ArrowRight,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { ToolInvocation } from "ai";

type ToolOperation = "create" | "edit" | "view" | "undo" | "rename" | "delete" | "unknown";

interface ToolLabelInfo {
  label: string;
  operation: ToolOperation;
  hidden: boolean;
}

const OPERATION_ICONS: Record<ToolOperation, LucideIcon> = {
  create:  FilePlus2,
  edit:    Pencil,
  view:    Eye,
  undo:    RotateCcw,
  rename:  ArrowRight,
  delete:  Trash2,
  unknown: Pencil,
};

const OPERATION_COLORS: Record<ToolOperation, string> = {
  create:  "text-blue-600",
  edit:    "text-amber-600",
  view:    "text-neutral-400",
  undo:    "text-orange-600",
  rename:  "text-violet-600",
  delete:  "text-red-600",
  unknown: "text-neutral-500",
};

function basename(path: unknown): string | null {
  return typeof path === "string" ? (path.split("/").pop() || null) : null;
}

function getToolLabelInfo(
  toolName: string,
  args: Record<string, unknown>
): ToolLabelInfo {
  if (toolName === "str_replace_editor") {
    const file = basename(args.path);
    if (!file) return { label: "Editing file", operation: "edit", hidden: false };

    switch (args.command) {
      case "create":
        return { label: `Creating ${file}`, operation: "create", hidden: false };
      case "str_replace":
        return { label: `Editing ${file}`, operation: "edit", hidden: false };
      case "insert":
        return { label: `Editing ${file}`, operation: "edit", hidden: false };
      case "view":
        return { label: `Reading ${file}`, operation: "view", hidden: true };
      case "undo_edit":
        return { label: `Undoing edit in ${file}`, operation: "undo", hidden: false };
      default:
        return { label: `Editing ${file}`, operation: "edit", hidden: false };
    }
  }

  if (toolName === "file_manager") {
    const file = basename(args.path);
    if (!file) return { label: "Managing file", operation: "unknown", hidden: false };

    switch (args.command) {
      case "rename": {
        const dest = basename(args.new_path);
        const label = dest ? `Renaming ${file} \u2192 ${dest}` : `Renaming ${file}`;
        return { label, operation: "rename", hidden: false };
      }
      case "delete":
        return { label: `Deleting ${file}`, operation: "delete", hidden: false };
      default:
        return { label: `Managing ${file}`, operation: "unknown", hidden: false };
    }
  }

  return { label: toolName, operation: "unknown", hidden: false };
}

// Preserved public API for backward compatibility
export function getToolLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  return getToolLabelInfo(toolName, args).label;
}

function isErrorResult(result: unknown): boolean {
  if (typeof result === "string") return result.startsWith("Error:");
  if (typeof result === "object" && result !== null) {
    return (result as Record<string, unknown>).success === false;
  }
  return false;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const { label, operation, hidden } = getToolLabelInfo(
    toolInvocation.toolName,
    toolInvocation.args as Record<string, unknown>
  );

  if (hidden) return null;

  const isInProgress = toolInvocation.state !== "result";
  const hasError =
    toolInvocation.state === "result" && isErrorResult(toolInvocation.result);

  const OperationIcon = OPERATION_ICONS[operation];
  const operationColor = OPERATION_COLORS[operation];

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 bg-neutral-50 rounded-md text-xs border border-neutral-200">
      {hasError ? (
        <AlertCircle className="w-3 h-3 flex-shrink-0 text-red-500" />
      ) : isInProgress ? (
        <Loader2 className={`w-3 h-3 animate-spin flex-shrink-0 ${operationColor}`} />
      ) : (
        <OperationIcon className="w-3 h-3 flex-shrink-0 text-neutral-400" />
      )}
      <span className={hasError ? "text-red-600" : isInProgress ? "text-neutral-700" : "text-neutral-500"}>
        {label}
      </span>
    </div>
  );
}
