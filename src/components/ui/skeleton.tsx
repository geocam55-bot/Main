import { cn, filterFigmaProps } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...filterFigmaProps(props)}
    />
  );
}

export { Skeleton };
