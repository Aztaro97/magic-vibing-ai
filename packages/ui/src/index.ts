import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

export * from "./avatar";
export * from "./button";
export * from "./dialog";
export * from "./dropdown-menu";
export * from "./form";
export * from "./hooks/use-mobile";
export * from "./input";
export * from "./label";
export * from "./separator";
export * from "./sheet";
export * from "./sidebar";
export * from "./skeleton";
export * from "./tooltip";

export * from "./theme";
export { cn };
