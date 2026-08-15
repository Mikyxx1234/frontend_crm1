"use client";

import { TelephonyModal } from "@/features/softphone/components/telefonia/telephony-modal";

/** Compat: a Central de Widgets usa o modal standalone via registry. */
export function SoftphoneConfig({ onClose }: { onClose?: () => void }) {
  return <TelephonyModal onClose={onClose} />;
}

export default SoftphoneConfig;
