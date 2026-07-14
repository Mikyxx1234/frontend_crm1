import { ICON_MAP } from "./lucide-tabler-map.mjs";
import * as tabler from "@tabler/icons-react";

const missing = [];
for (const [lucide, tablerName] of Object.entries(ICON_MAP)) {
  if (!tabler[tablerName]) missing.push(`${lucide} -> ${tablerName}`);
}

if (missing.length === 0) {
  console.log("✅ Todos os ícones do mapa existem no @tabler/icons-react!");
} else {
  console.log(`❌ ${missing.length} mapeamentos inválidos:`);
  missing.forEach(m => console.log("  " + m));
}
