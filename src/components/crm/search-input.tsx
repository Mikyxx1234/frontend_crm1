"use client";

import {
  PageSearchBar,
  type PageSearchBarProps,
} from "@/components/crm/page-toolbar";

export type SearchInputProps = Omit<PageSearchBarProps, "variant">;

/**
 * Alias legado — busca compacta (`h-10`) para o centro do PageHeader.
 * A largura vem do slot `center` do PageHeader (`w-[32rem]` no desktop).
 * Novas telas com busca em linha própria devem usar `PageSearchBar` variant toolbar.
 */
export function SearchInput(props: SearchInputProps) {
  return <PageSearchBar variant="compact" {...props} />;
}
