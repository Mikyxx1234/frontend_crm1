"use client";

import * as React from "react";
import Link from "next/link";

import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExportPanel,
  ImportPanel,
  useImportExportBump,
} from "@/features/pipeline-v2/import-export";

export default function ImportSettingsPage() {
  const bump = useImportExportBump();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link
          href="/old/settings"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Configurações
        </Link>
        <h1 className={pageHeaderTitleClass}>Importar / Exportar base</h1>
        <p className={pageHeaderDescriptionClass}>
          Importe CSV com identificadores estáveis — linhas com o mesmo{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">id</code> /{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">external_id</code> são{" "}
          <strong className="font-medium text-foreground">atualizadas</strong>, não duplicadas. Ou
          exporte sua base atual em CSV para backup, análise ou migração.
        </p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4">
          <ImportPanel onDone={bump} />
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <ExportPanel />
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground">
        Apenas administradores e gerentes podem importar ou exportar.
      </p>
    </div>
  );
}
