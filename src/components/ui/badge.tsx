import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-brand text-primary-foreground shadow-soft ring-1 ring-primary/20 hover:brightness-105",
        secondary:
          "border-transparent bg-secondary/80 text-secondary-foreground ring-1 ring-border/60 hover:bg-secondary",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        outline: "border-border/70 bg-background/60 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
