"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Clock,
  FileText,
  Kanban,
  Key,
  LayoutList,
  MessageCircle,
  Package,
  Radio,
  Settings2,
  Shield,
  Shuffle,
  Smartphone,
  Sparkles,
  Tag,
  ThumbsDown,
  Upload,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const sidebarItems = [
  {
    id: "canais",
    label: "Canais",
    description: "WhatsApp, redes e e-mail",
    icon: Radio,
    href: "/settings/channels" as const,
  },
  {
    id: "equipe",
    label: "Equipe",
    description: "Membros e funcoes",
    icon: Users,
    href: "/settings/team" as const,
  },
  {
    id: "permissoes",
    label: "Permissoes",
    description: "Visibilidade de leads",
    icon: Shield,
    href: "/settings/permissions" as const,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    description: "Estágios e automações",
    icon: Kanban,
    href: "/settings/pipeline" as const,
  },
  {
    id: "distribuicao",
    label: "Distribuição",
    description: "Round-robin e regras",
    icon: Shuffle,
    href: "/settings/distribution" as const,
  },
  {
    id: "horarios",
    label: "Horários e Disponibilidade",
    description: "Expediente e status dos agentes",
    icon: Clock,
    href: "/settings/schedules" as const,
  },
  {
    id: "produtos",
    label: "Produtos",
    description: "Catálogo de produtos",
    icon: Package,
    href: "/settings/products" as const,
  },
  {
    id: "tags",
    label: "Tags",
    description: "Gerenciar tags e cores",
    icon: Tag,
    href: "/settings/tags" as const,
  },
  {
    id: "campos",
    label: "Campos Personalizados",
    description: "Contatos e negócios",
    icon: LayoutList,
    href: "/settings/custom-fields" as const,
  },
  {
    id: "respostas-rapidas",
    label: "Respostas Rápidas",
    description: "Mensagens predefinidas",
    icon: Zap,
    href: "/settings/quick-replies" as const,
  },
  {
    id: "templates",
    label: "Templates",
    description: "Modelos de mensagem",
    icon: FileText,
    href: "/settings/templates" as const,
  },
  {
    id: "whatsapp-templates-meta",
    label: "Templates Meta (WABA)",
    description: "Criar e acompanhar na Meta",
    icon: MessageCircle,
    href: "/settings/whatsapp-templates" as const,
  },
  {
    id: "motivos-perda",
    label: "Motivos de perda",
    description: "Razões de perda de negócios",
    icon: ThumbsDown,
    href: "/settings/loss-reasons" as const,
  },
  {
    id: "api-tokens",
    label: "Chaves de API",
    description: "Tokens para integrações",
    icon: Key,
    href: "/settings/api-tokens" as const,
  },
  {
    id: "ia",
    label: "IA",
    description: "Chave da OpenAI e agentes",
    icon: Sparkles,
    href: "/settings/ai" as const,
  },
  {
    id: "importar",
    label: "Importar base",
    description: "CSV contatos e negócios",
    icon: Upload,
    href: "/settings/import" as const,
  },
  {
    id: "notificacoes",
    label: "Notificações",
    description: "Push, e-mail e canais de aviso",
    icon: Bell,
    href: "/settings/notifications" as const,
  },
  {
    id: "mobile-layout",
    label: "Layout do app mobile",
    description: "Personalizar barra inferior do PWA",
    icon: Smartphone,
    href: "/settings/mobile-layout" as const,
  },
  {
    id: "geral",
    label: "Geral",
    description: "Preferências do workspace",
    icon: Settings2,
    href: null,
  },
] as const;

export default function SettingsPage() {
  const pathname = usePathname();
  const [tab, setTab] = useState<string>("canais");

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          title="Configurações"
          description="Gerencie integrações, perfil e preferências."
          icon={<Settings2 />}
        />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <nav className="space-y-0.5">
            {sidebarItems.map((item) => {
              const active =
                item.href != null
                  ? pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                  : tab === item.id;
              const Icon = item.icon;
              const content = (
                <span
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-tight">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </span>
              );

              if (item.href) {
                return (
                  <Link key={item.id} href={item.href} className="block">
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className="block w-full"
                  onClick={() => setTab(item.id)}
                >
                  {content}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Coluna direita oculta em < lg: o hub é a sidebar.
            Em mobile o usuario clica no item e navega pra subpage,
            sem precisar dos placeholder cards do lado. */}
        <div className="hidden min-w-0 flex-1 lg:block">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsContent value="canais" className="mt-0">
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">
                      Canais de comunicação
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      Integrações
                    </Badge>
                  </div>
                  <CardDescription>
                    Conecte WhatsApp via Meta Cloud API, redes sociais e outros
                    pontos de contato. A gestão completa fica na área dedicada.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Abra a lista de canais para conectar, ver QR Code e
                    configurar credenciais.
                  </p>
                  <Link
                    href="/settings/channels"
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    Ir para canais
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="equipe" className="mt-0">
              <PlaceholderCard
                title="Equipe"
                description="Convites, papéis e permissões serão configurados aqui."
                icon={Users}
              />
            </TabsContent>

            <TabsContent value="geral" className="mt-0">
              <PlaceholderCard
                title="Geral"
                description="Idioma, fuso horário e notificações — em desenvolvimento."
                icon={Bell}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-lg">
          <span className="flex size-8 items-center justify-center rounded-md bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed bg-muted/20">
          <p className="text-xs text-muted-foreground">Em breve</p>
        </div>
      </CardContent>
    </Card>
  );
}
