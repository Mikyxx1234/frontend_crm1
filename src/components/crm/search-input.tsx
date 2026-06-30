"use client";

import {
  PageSearchBar,
  type PageSearchBarProps,
} from "@/components/crm/page-toolbar";

export type SearchInputProps = Omit<PageSearchBarProps, "variant">;

/**
 * Alias legado — busca compacta (`w-80`, `h-10`) para o centro do PageHeader.
 * Novas telas com busca em linha própria devem usar `PageSearchBar` variant toolbar.
 */
export function SearchInput(props: SearchInputProps) {
  return <PageSearchBar variant="compact" {...props} />;
}
