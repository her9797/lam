"use client";

import "@/i18n/client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  RiArrowDownSLine,
  RiDashboardLine,
  RiFileTextLine,
  RiFolderLine,
  RiMegaphoneLine,
  RiMusic2Line,
  RiRestaurantLine,
  RiShoppingBag3Line,
  RiStarLine,
  RiUserVoiceLine,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { LanguageMenu } from "@/features/settings/LanguageMenu";
import { ThemeMenu } from "@/features/settings/ThemeMenu";
import { ThemeProvider } from "@/features/settings/ThemeProvider";

// Must match the root layout's skip link target (`app/layout.tsx`) so the
// single global skip link works on admin pages too — this shell must not
// render a second, duplicate skip link.
const MAIN_CONTENT_ID = "main-content";

type NavItem = {
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

const TOP_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "navDashboard", icon: RiDashboardLine },
  { href: "/requests", labelKey: "navRequests", icon: RiUserVoiceLine },
  { href: "/song-requests", labelKey: "navSongRequests", icon: RiMusic2Line },
  { href: "/special-requests", labelKey: "navSpecialRequests", icon: RiStarLine },
];

// A labeled sub-section rather than its own link — "상품 관리" has no page
// of its own, only the two management screens nested under it.
const PRODUCT_NAV_GROUP: { labelKey: string; icon: ComponentType<{ className?: string }>; items: NavItem[] } = {
  labelKey: "navProducts",
  icon: RiShoppingBag3Line,
  items: [
    { href: "/menu", labelKey: "navMenu", icon: RiRestaurantLine },
    { href: "/menu/categories", labelKey: "navCategories", icon: RiFolderLine },
  ],
};

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/notices", labelKey: "navNotices", icon: RiMegaphoneLine },
  { href: "/store-copy", labelKey: "navStoreCopy", icon: RiFileTextLine },
];

const ALL_NAV_ITEMS: NavItem[] = [...TOP_NAV_ITEMS, ...PRODUCT_NAV_GROUP.items, ...BOTTOM_NAV_ITEMS];

function findActiveItem(pathname: string | null): NavItem | undefined {
  if (!pathname) {
    return undefined;
  }
  const exactMatch = ALL_NAV_ITEMS.find((item) => pathname === item.href);
  if (exactMatch) {
    return exactMatch;
  }
  // "/menu/categories" starts with both "/menu/" and "/menu/categories/", so
  // prefix matches are resolved by the longest (most specific) href — plain
  // find() order would otherwise let "/menu" claim a "/menu/categories" path.
  return ALL_NAV_ITEMS.filter((item) => pathname.startsWith(`${item.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

function AdminShellContent({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Manual toggle only; whether the dropdown is actually shown also factors
  // in the current route below, so landing directly on "/menu" or
  // "/menu/categories" (e.g. from the dashboard's shortcut card) reveals it
  // without requiring a click first.
  const [isProductMenuToggledOpen, setIsProductMenuToggledOpen] = useState(false);
  const activeItem = findActiveItem(pathname);
  const isOnProductRoute = PRODUCT_NAV_GROUP.items.some((item) => activeItem?.href === item.href);
  const isProductMenuOpen = isProductMenuToggledOpen || isOnProductRoute;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/admin-logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  function renderNavItem(item: NavItem) {
    const Icon = item.icon;
    const isActive = activeItem?.href === item.href;
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton isActive={isActive} render={<Link href={item.href} />}>
          <Icon className="size-4" />
          <span>{t(item.labelKey)}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <span className="px-2 py-1 text-sm font-semibold text-sidebar-foreground">
            {t("appName")}
          </span>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label={t("navigation")}>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {TOP_NAV_ITEMS.map(renderNavItem)}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      aria-expanded={isProductMenuOpen}
                      onClick={() => setIsProductMenuToggledOpen((open) => !open)}
                    >
                      <PRODUCT_NAV_GROUP.icon className="size-4" />
                      <span>{t(PRODUCT_NAV_GROUP.labelKey)}</span>
                      <RiArrowDownSLine
                        aria-hidden="true"
                        className={`ml-auto size-4 transition-transform ${isProductMenuOpen ? "" : "-rotate-90"}`}
                      />
                    </SidebarMenuButton>
                    {isProductMenuOpen ? (
                      <SidebarMenuSub>
                        {PRODUCT_NAV_GROUP.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeItem?.href === item.href;
                          return (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton isActive={isActive} render={<Link href={item.href} />}>
                                <Icon className="size-4" />
                                <span>{t(item.labelKey)}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                  {BOTTOM_NAV_ITEMS.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? t("loggingOut") : t("logout")}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
          <SidebarTrigger aria-label={t("openMenu")} />
          <nav aria-label="breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <li>
                <Link href="/dashboard" className="hover:text-foreground">
                  {t("breadcrumbHome")}
                </Link>
              </li>
              {activeItem ? (
                <>
                  <li aria-hidden="true">/</li>
                  <li className="truncate font-medium text-foreground" aria-current="page">
                    {t(activeItem.labelKey)}
                  </li>
                </>
              ) : null}
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <LanguageMenu />
            <ThemeMenu />
          </div>
        </header>
        <main id={MAIN_CONTENT_ID} className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AdminShellContent>{children}</AdminShellContent>
    </ThemeProvider>
  );
}
