"use client";

import "@/i18n/client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  RiDashboardLine,
  RiFileTextLine,
  RiMegaphoneLine,
  RiMusic2Line,
  RiRestaurantLine,
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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LanguageMenu } from "@/features/settings/LanguageMenu";
import { ThemeMenu } from "@/features/settings/ThemeMenu";
import { ThemeProvider } from "@/features/settings/ThemeProvider";

const MAIN_CONTENT_ID = "admin-main-content";

type NavItem = {
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "navDashboard", icon: RiDashboardLine },
  { href: "/requests", labelKey: "navRequests", icon: RiUserVoiceLine },
  { href: "/song-requests", labelKey: "navSongRequests", icon: RiMusic2Line },
  { href: "/special-requests", labelKey: "navSpecialRequests", icon: RiStarLine },
  { href: "/menu", labelKey: "navMenu", icon: RiRestaurantLine },
  { href: "/notices", labelKey: "navNotices", icon: RiMegaphoneLine },
  { href: "/store-copy", labelKey: "navStoreCopy", icon: RiFileTextLine },
];

function findActiveItem(pathname: string | null): NavItem | undefined {
  if (!pathname) {
    return undefined;
  }
  return NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

function AdminShellContent({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const activeItem = findActiveItem(pathname);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/admin-logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <SidebarProvider>
      <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
        {t("skipToContent")}
      </a>
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
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem?.href === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          render={<Link href={item.href} />}
                        >
                          <Icon className="size-4" />
                          <span>{t(item.labelKey)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
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
