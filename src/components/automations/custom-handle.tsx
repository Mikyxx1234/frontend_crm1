"use client";

import { Handle, Position, type HandleProps } from "@xyflow/react";

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

  const isErrorPort = Boolean(className?.includes("fx-port--error"));

  return (
    <Handle
      {...props}
      position={isErrorPort ? Position.Bottom : props.position}
      isConnectable={connectable as HandleProps["isConnectable"]}
      className={
        className
          ? `wf-handle fx-port ${className}`
          : "wf-handle fx-port fx-port--flow"
      }
    />
  );
}
