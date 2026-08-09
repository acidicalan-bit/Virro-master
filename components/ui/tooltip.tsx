"use client";

// Adapted from Origin UI (MIT): https://github.com/shadcn/originui/blob/main/registry/default/ui/tooltip.tsx
import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipProvider><TooltipPrimitive.Root {...props} /></TooltipProvider>;
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger {...props} />;
}

function TooltipContent({ className, sideOffset = 8, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return <TooltipPrimitive.Portal><TooltipPrimitive.Content sideOffset={sideOffset} className={cn("rebuild-tooltip", className)} {...props}>{children}</TooltipPrimitive.Content></TooltipPrimitive.Portal>;
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
