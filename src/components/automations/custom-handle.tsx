"use client";

import { Handle, type HandleProps } from "@xyflow/react";

/**
 * Handle com limite de conexões (padrão React Flow connection-limit).
 * `connectionLimit` → `isConnectable` numérico (máx. edges neste handle).
 */
export type CustomHandleProps = Omit<HandleProps, "isConnectable"> & {
  connectionLimit?: number;
  /** Força desabilitar conexão. */
  isConnectable?: boolean;
};

export function CustomHandle({
  connectionLimit = 1,
  isConnectable,
  className,
  ...props
}: CustomHandleProps) {
  // boolean força off; senão o número limita (API @xyflow/react).
  const connectable: boolean | number =
    typeof isConnectable === "boolean" ? isConnectable : connectionLimit;

  return (
    <Handle
      {...props}
      isConnectable={connectable as HandleProps["isConnectable"]}
      className={
        className
          ? `wf-handle fx-port ${className}`
          : "wf-handle fx-port fx-port--flow"
      }
    />
  );
}
