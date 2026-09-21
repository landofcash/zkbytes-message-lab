import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  variant?: "default" | "outline";
};
export function Button({
  className,
  asChild = false,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      type={asChild ? undefined : type}
      className={cn(
        "button",
        variant === "outline" && "button-outline",
        className,
      )}
      {...props}
    />
  );
}
