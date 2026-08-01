import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

/*
 * Uma acao primaria clara por tela; secundarias visualmente discretas.
 * Altura minima de 44px atende ao alvo de toque exigido na Secao 16.2.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-graphite text-white hover:bg-graphite-dark",
        secondary:
          "border border-border bg-white text-graphite hover:bg-surface",
        ghost: "text-graphite hover:bg-surface",
        danger: "bg-danger text-white hover:brightness-90",
        link: "text-info underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  block,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
