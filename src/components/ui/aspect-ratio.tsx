"use client";

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

import { filterFigmaProps } from "./utils";

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...filterFigmaProps(props)} />;
}

export { AspectRatio };