import * as React from "react";

import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";
import { filterFigmaProps } from "./utils";

const Toaster = ({ ...props }: ToasterProps) => {
  // Detect theme from the <html> element's class list (set by ThemeProvider)
  const [theme, setTheme] = React.useState<"light" | "dark" | "system">("system");

  React.useEffect(() => {
    const html = document.documentElement;
    const update = () => {
      setTheme(html.classList.contains("dark") ? "dark" : "light");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...filterFigmaProps(props)}
    />
  );
};

export { Toaster };