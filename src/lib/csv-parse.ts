/** Normaliza cabeçalhos CSV para chaves estáveis (snake_case). */
export function normalizeCsvHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    // Remove acentos: "título" → "titulo".
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Qualquer caractere não alfanumérico vira "_" (engloba espaços, hífens,
    // parênteses, pontos etc.) — útil para headers Kommo como "Telefone
    // comercial (contato)" → "telefone_comercial_contato".
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type CsvDelimiter = "," | ";" | "\t";

/**
 * Parser CSV char-a-char (state machine). Suporta:
 *  - Delimitador configurável (",", ";", "\t")
 *  - Quebra de linha dentro de campos com aspas ("…\n…")
 *  - Escape de aspas duplas dentro de quoted (`""` => `"`)
 *  - BOM UTF-8 no início do arquivo
 *  - CRLF e LF
 */
export function parseCsv(
  text: string,
  delimiter: CsvDelimiter = ",",
): { headers: string[]; rows: Record<string, string>[] } {
  if (text.length === 0) return { headers: [], rows: [] };

  let src = text;
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") {
      if (src[i + 1] === "\n") continue;
      row.push(field);
      records.push(row);
      field = "";
      row = [];
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      records.push(row);
      field = "";
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  const cleaned = records.filter((r) => r.some((c) => c.trim().length > 0));
  if (cleaned.length === 0) return { headers: [], rows: [] };

  const headerCells = cleaned[0].map(normalizeCsvHeader);
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < cleaned.length; r++) {
    const cells = cleaned[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headerCells.length; c++) {
      obj[headerCells[c]] = (cells[c] ?? "").trim();
    }
    rows.push(obj);
  }

  return { headers: headerCells, rows };
}

export function parseCsvLine(line: string, delimiter: CsvDelimiter = ","): string[] {
  const { rows } = parseCsv(`__h${delimiter}placeholder\n${line}`, delimiter);
  if (rows.length === 0) return [];
  return Object.values(rows[0]);
}

/**
 * Detecta heuristicamente o delimitador analisando a primeira linha de texto.
 * Conta ocorrências de ";", "," e "\t" e devolve o que mais aparece. Default: ",".
 */
export function detectDelimiter(text: string): CsvDelimiter {
  const sample = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<CsvDelimiter, number> = {
    ",": 0,
    ";": 0,
    "\t": 0,
  };
  let inQuotes = false;
  for (let i = 0; i < sample.length; i++) {
    const ch = sample[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "," || ch === ";" || ch === "\t")) {
      counts[ch] += 1;
    }
  }
  const best = (Object.entries(counts) as [CsvDelimiter, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return best[1] > 0 ? best[0] : ",";
}

/**
 * Parseia uma planilha XLSX/XLS/ODS a partir de ArrayBuffer.
 * Requer a lib "xlsx" (SheetJS). Carregada via import dinâmico para não
 * pesar o bundle inicial. Lança erro se a lib não estiver instalada.
 */
export async function parseXlsx(
  buffer: ArrayBuffer,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };
  const ws = wb.Sheets[firstSheetName];
  if (!ws) return { headers: [], rows: [] };

  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (data.length === 0) return { headers: [], rows: [] };

  const headerRow = (data[0] ?? []) as unknown[];
  const headers = headerRow.map((h) => normalizeCsvHeader(String(h ?? "")));

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < data.length; r++) {
    const arr = (data[r] ?? []) as unknown[];
    if (arr.every((v) => v === null || v === undefined || String(v).trim() === "")) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = String(arr[c] ?? "").trim();
    }
    rows.push(obj);
  }

  return { headers, rows };
}
