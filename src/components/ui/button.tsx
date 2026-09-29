import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

/** Local shadcn-style primitive with SchoolPay theme variants. */
export function Button({ variant = "default", className, children, ...props }: ButtonProps) {
  const variantClass = variant === "secondary" ? "button-secondary" : variant === "ghost" ? "button-ghost" : "button-primary";
  return <button className={cn("button", variantClass, className)} {...props}>{children}</button>;
}
