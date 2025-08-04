import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

export * from "./avatar";
export * from "./button";
export * from "./dialog";
export * from "./dropdown-menu";
export * from "./form";
export * from "./input";
export * from "./label";
export * from "./theme";
export { cn };
