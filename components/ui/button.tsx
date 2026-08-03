// Adapted from Origin UI (MIT): https://github.com/shadcn/originui
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--white)] text-[var(--ink)] shadow-[0_14px_50px_rgba(230,255,73,.12)] hover:-translate-y-0.5 hover:bg-[var(--acid)]",
        outline:
          "border border-white/15 bg-white/[.035] text-white hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[.08]",
        ghost: "text-white/70 hover:bg-white/[.06] hover:text-white",
        acid: "bg-[var(--acid)] text-[#0a0d12] hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(216,255,91,.2)]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-7 text-[15px]",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
