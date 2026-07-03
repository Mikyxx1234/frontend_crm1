"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Tabs>`);
  }
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      className,
      value: valueProp,
      defaultValue = "",
      onValueChange,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
    const isControlled = valueProp !== undefined;
    const value = isControlled ? valueProp : uncontrolled;
    const baseId = React.useId();

    const handleChange = React.useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolled(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange]
    );

    const ctx = React.useMemo(
      () => ({
        value,
        onValueChange: handleChange,
        baseId,
      }),
      [value, handleChange, baseId]
    );

    return (
      <TabsContext.Provider value={ctx}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={cn(
      // TabsList glass: fundo translúcido, radius pill, com sombra sutil
      "inline-flex h-9 items-center justify-center rounded-[var(--radius-input)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-1 text-[var(--color-ink-soft)] shadow-[var(--glass-shadow-sm)] backdrop-blur-sm",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value: triggerValue, onClick, ...props }, ref) => {
    const { value, onValueChange, baseId } = useTabsContext("TabsTrigger");
    const selected = value === triggerValue;
    const tabId = `${baseId}-tab-${triggerValue}`;
    const panelId = `${baseId}-panel-${triggerValue}`;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={tabId}
        aria-selected={selected}
        aria-controls={panelId}
        tabIndex={selected ? 0 : -1}
        data-state={selected ? "active" : "inactive"}
        className={cn(
          // TabsTrigger glass: ativa = pill branca translúcida + texto brand
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1 font-display text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50",
          selected
            ? "border border-[var(--glass-border)] bg-white/70 text-primary shadow-[var(--glass-shadow-sm)] font-semibold backdrop-blur"
            : "text-[var(--color-ink-soft)] hover:text-foreground hover:bg-[var(--glass-bg-panel)]",
          className
        )}
        {...props}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) onValueChange(triggerValue);
        }}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value: contentValue, forceMount, ...props }, ref) => {
    const { value, baseId } = useTabsContext("TabsContent");
    const selected = value === contentValue;
    const tabId = `${baseId}-tab-${contentValue}`;
    const panelId = `${baseId}-panel-${contentValue}`;

    if (!forceMount && !selected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId}
        hidden={!selected && !forceMount}
        data-state={selected ? "active" : "inactive"}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !selected && forceMount && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
