"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const AvatarContext = React.createContext<{
  imageLoaded: boolean;
  setImageLoaded: (v: boolean) => void;
} | null>(null);

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  return (
    <AvatarContext.Provider value={{ imageLoaded, setImageLoaded }}>
      <div
        ref={ref}
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, onLoad, onError, ...props }, ref) => {
  const ctx = React.useContext(AvatarContext);
  React.useEffect(() => {
    ctx?.setImageLoaded(false);
  }, [ctx, props.src]);

  return (
    <img
      ref={ref}
      alt={props.alt ?? ""}
      className={cn(
        "aspect-square size-full object-cover transition-opacity",
        ctx && !ctx.imageLoaded && "opacity-0",
        className
      )}
      onLoad={(e) => {
        ctx?.setImageLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        ctx?.setImageLoaded(false);
        onError?.(e);
      }}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(AvatarContext);
  const hidden = ctx?.imageLoaded === true;
  return (
    <div
      ref={ref}
      aria-hidden={hidden}
      className={cn(
        "absolute inset-0 flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground",
        hidden && "pointer-events-none opacity-0",
        className
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
