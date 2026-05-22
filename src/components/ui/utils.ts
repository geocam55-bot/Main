import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Filter out Figma Make inspector props that shouldn't reach the DOM
export function filterFigmaProps(props: Record<string, any>): Record<string, any> {
  const filtered = { ...props };
  for (const key in filtered) {
    if (typeof key === 'string' && key.startsWith('_fg')) {
      delete filtered[key];
    }
  }
  return filtered;
}
