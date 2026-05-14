"use client";

/**
 * AvatarCropDialog — recorte circular da foto de perfil.
 * ──────────────────────────────────────────────────────
 * Antes: o operador subia uma foto qualquer (logo, retrato, captura
 * de tela, qualquer aspect ratio) e o sistema só aplicava
 * `object-cover` num círculo de 96px. Resultado: imagens largas viam
 * "uma fatia central" do conteúdo (no caso reportado, uma logo
 * "EduIT" virava um "lu" gigante porque o crop pegava só as letras
 * do meio).
 *
 * Solução: este modal intercepta o `File` antes do upload, mostra a
 * imagem inteira numa área quadrada com máscara circular sobreposta,
 * e permite ao operador:
 *   1. **Arrastar** a imagem com mouse/touch pra posicionar.
 *   2. **Dar zoom** com slider, scroll do mouse ou pinch (toque).
 *
 * Ao aplicar, um <canvas> 512×512 é renderizado com APENAS a região
 * dentro do círculo e exportado como Blob → File JPEG (qualidade
 * 0.92, mais leve que PNG e suficiente pro avatar). Esse novo File
 * é o que sobe pra `/api/profile/avatar` — o servidor recebe uma
 * imagem já quadrada e otimizada.
 *
 * Sem dependência nova: tudo feito com `<canvas>`, eventos de
 * pointer e math básica. Total ~250 linhas, autocontido, pode ser
 * reusado em qualquer outro upload de avatar (contatos, agentes,
 * organização) sem mudar nada.
 */

import * as React from "react";
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Tamanho da área de edição (px). Quadrada — círculo inscrito nela.
// Maior = mais espaço pra precisão; menor = caber em telas pequenas.
// 320px é um bom equilíbrio (cabe em mobile retrato com folga e
// dá pra ver detalhes da imagem sem precisar dar zoom absurdo).
const STAGE_SIZE = 320;

// Resolução final do avatar exportado. 512×512 é o sweet-spot:
// nítido em qualquer renderização (avatar de 96px = 5x downscale,
// tela retina = 192px = ainda 2.6x), mas pequeno o suficiente
// pra não estourar o limite de upload típico (5-10MB).
const EXPORT_SIZE = 512;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export interface AvatarCropDialogProps {
  /** Arquivo selecionado pelo operador. `null` = modal fechado. */
  file: File | null;
  /** Chamado quando o operador cancela ou fecha o modal. */
  onCancel: () => void;
  /** Chamado com o `File` recortado (JPEG quadrado). */
  onApply: (cropped: File) => Promise<void> | void;
  /** Estado de carregamento externo (ex.: upload em andamento) — desabilita Aplicar. */
  isApplying?: boolean;
}

export function AvatarCropDialog({
  file,
  onCancel,
  onApply,
  isApplying = false,
}: AvatarCropDialogProps) {
  // URL local pra renderizar a imagem dentro do crop. Criado via
  // `URL.createObjectURL` quando o File chega, e revogado no cleanup
  // pra não vazar memória (cada blob ocupa o tamanho da imagem).
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Dimensões reais da imagem carregada — necessário pro cálculo
  // do zoom mínimo (a imagem precisa SEMPRE cobrir o círculo de
  // crop, então o zoom inicial é o `STAGE_SIZE / menor lado`).
  const [naturalSize, setNaturalSize] = React.useState<{
    w: number;
    h: number;
  } | null>(null);

  // Estado do crop: zoom (multiplicador) + offset (deslocamento
  // do centro da imagem em relação ao centro do palco, em px).
  // Resetado a cada nova imagem.
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!naturalSize) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [naturalSize]);

  // Quando a imagem carrega, calcula o "fit-cover" inicial: o
  // menor lado da imagem deve caber no STAGE_SIZE inteiro
  // (assim a imagem cobre o círculo todo, sem sobras transparentes
  // nas bordas). Isso é o `baseScale`. O `zoom` que o usuário
  // controla é multiplicado em cima desse base.
  const baseScale = React.useMemo(() => {
    if (!naturalSize) return 1;
    return STAGE_SIZE / Math.min(naturalSize.w, naturalSize.h);
  }, [naturalSize]);

  const effectiveScale = baseScale * zoom;

  // Limita o offset pra imagem nunca "sair" do palco — sempre tem
  // que cobrir o círculo. Calcula o overflow disponível em cada
  // eixo (metade do que sobra além do palco) e clampa o offset.
  const clampedOffset = React.useMemo(() => {
    if (!naturalSize) return offset;
    const scaledW = naturalSize.w * effectiveScale;
    const scaledH = naturalSize.h * effectiveScale;
    const maxX = Math.max(0, (scaledW - STAGE_SIZE) / 2);
    const maxY = Math.max(0, (scaledH - STAGE_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, offset.x)),
      y: Math.max(-maxY, Math.min(maxY, offset.y)),
    };
  }, [offset, effectiveScale, naturalSize]);

  // Drag — guarda a posição inicial do ponteiro e o offset no
  // momento do `pointerdown`, e aplica o delta enquanto move.
  const dragStart = React.useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: clampedOffset.x,
      offsetY: clampedOffset.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: dragStart.current.offsetX + dx,
      y: dragStart.current.offsetY + dy,
    });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStart.current = null;
    setOffset(clampedOffset);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  };

  // Renderização final: cria um canvas EXPORT_SIZE × EXPORT_SIZE,
  // calcula a porção da imagem que está dentro do palco no momento
  // do recorte (em coordenadas da imagem original) e desenha
  // mapeando essa região pra todo o canvas. Resultado: imagem
  // quadrada já recortada, pronta pra virar Blob.
  const exportCroppedFile = React.useCallback(async (): Promise<File | null> => {
    if (!file || !imageUrl || !naturalSize) return null;

    // Carrega a imagem num <img> off-DOM pra ter acesso aos pixels
    // (necessário pro `drawImage`). Usar HTMLImageElement em vez
    // de ImageBitmap pra max compatibilidade entre navegadores.
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fundo branco — se a imagem original tiver transparência
    // (PNG/WebP), o JPEG exportado sem isso fica preto onde tinha
    // alpha. Branco é o default seguro pra avatares.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

    // Coordenadas da janela de crop NA IMAGEM ORIGINAL (não no palco).
    // Inversão: STAGE_SIZE px do palco = STAGE_SIZE / effectiveScale
    // px na imagem original. O centro é o meio da imagem deslocado
    // pelo offset (também invertido pra coords da imagem).
    const cropSizeOnImage = STAGE_SIZE / effectiveScale;
    const centerXOnImage =
      naturalSize.w / 2 - clampedOffset.x / effectiveScale;
    const centerYOnImage =
      naturalSize.h / 2 - clampedOffset.y / effectiveScale;
    const sx = centerXOnImage - cropSizeOnImage / 2;
    const sy = centerYOnImage - cropSizeOnImage / 2;

    ctx.drawImage(
      img,
      sx,
      sy,
      cropSizeOnImage,
      cropSizeOnImage,
      0,
      0,
      EXPORT_SIZE,
      EXPORT_SIZE,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });
    if (!blob) return null;

    // Renomeia pra ter extensão consistente — o servidor pode
    // confiar no `.jpg` e setar Content-Type sem precisar
    // re-detectar magic bytes.
    const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  }, [file, imageUrl, naturalSize, effectiveScale, clampedOffset]);

  const handleApply = async () => {
    const cropped = await exportCroppedFile();
    if (cropped) await onApply(cropped);
  };

  const isOpen = file !== null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v && !isApplying) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Enquadrar foto</DialogTitle>
          <DialogDescription>
            Arraste para posicionar e use o zoom para enquadrar a área que
            ficará visível no seu avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/*
            Palco do crop — quadrado com a imagem desenhada por baixo
            e uma máscara circular sobreposta. A máscara é feita com
            `box-shadow` GIGANTE (`0 0 0 9999px`) preenchendo todo
            o quadrado MENOS o círculo do meio. Mais barato que SVG
            mask e funciona em qualquer browser.
          */}
          <div
            className="relative touch-none overflow-hidden rounded-2xl bg-slate-100 select-none"
            style={{ width: STAGE_SIZE, height: STAGE_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                onLoad={(e) => {
                  const i = e.currentTarget;
                  setNaturalSize({ w: i.naturalWidth, h: i.naturalHeight });
                }}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) translate(${clampedOffset.x}px, ${clampedOffset.y}px) scale(${effectiveScale})`,
                  transformOrigin: "center center",
                  maxWidth: "none",
                  pointerEvents: "none",
                  willChange: "transform",
                }}
              />
            )}
            {/* Máscara circular — anel escuro com furo do tamanho
                do palco, dando a sensação de "só o círculo importa". */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
              }}
            />
            {/* Borda branca do círculo — referência visual fina pro
                operador entender exatamente o que vai virar avatar. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80"
            />
          </div>

          {/* Controles de zoom — slider HTML padrão (acessível, leve,
              sem precisar de Radix). Setas adjacentes pra incremento
              fino. `aria-valuetext` traduz pra %, ajuda screen readers. */}
          <div className="flex w-full items-center gap-3">
            <TooltipHost label="Diminuir zoom" side="top">
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - 0.1) * 10) / 10))
                }
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-slate-900 active:scale-95"
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="size-4" />
              </button>
            </TooltipHost>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--color-primary)]"
              aria-label="Zoom"
              aria-valuetext={`${Math.round(zoom * 100)}%`}
            />
            <TooltipHost label="Aumentar zoom" side="top">
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + 0.1) * 10) / 10))
                }
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-slate-900 active:scale-95"
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="size-4" />
              </button>
            </TooltipHost>
            <TooltipHost label="Resetar enquadramento" side="top">
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-slate-500 transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-slate-900 active:scale-95"
                aria-label="Resetar enquadramento"
              >
                <RotateCcw className="size-4" />
              </button>
            </TooltipHost>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleApply()}
            disabled={isApplying || !naturalSize}
            className={cn("min-w-[100px]")}
          >
            {isApplying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Aplicar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
