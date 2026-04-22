"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpen, LayoutDashboard, Users, Shield, Route, LogOut,
  Settings, BarChart2, UserCircle, MoreHorizontal, Tag, Loader2, Bookmark,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TourGuide } from "@/components/tour-guide";
import { cn } from "@/lib/utils";
import { useState } from "react";

// ── Navigation definitions ────────────────────────────────────────────────────

const employeeNav = [
  { label: "Dashboard",       href: "/",            icon: <LayoutDashboard className="w-4 h-4" />, exact: true,  tour: "dashboard"    },
  { label: "My Training Path",href: "/my-path",     icon: <Route  className="w-4 h-4" />,          exact: false, tour: "my-path"      },
  { label: "All Lessons",     href: "/lessons",     icon: <BookOpen className="w-4 h-4" />,         exact: false, tour: "all-lessons"  },
  { label: "Watch Later",     href: "/watch-later", icon: <Bookmark className="w-4 h-4" />,         exact: false, tour: "watch-later"  },
];

const adminNav = [
  { label: "Manage Lessons",       href: "/admin/lessons",     icon: <BookOpen   className="w-4 h-4" />, tour: "admin-lessons"    },
  { label: "Categories",           href: "/admin/categories",  icon: <Tag        className="w-4 h-4" />, tour: "admin-categories" },
  { label: "Positions & Templates",href: "/admin/positions",   icon: <Route      className="w-4 h-4" />, tour: "admin-positions"  },
  { label: "Manage Groups",        href: "/admin/groups",      icon: <Shield     className="w-4 h-4" />, tour: "admin-groups"     },
  { label: "Employees",            href: "/admin/employees",   icon: <Users      className="w-4 h-4" />, tour: "admin-employees"  },
  { label: "Progress Dashboard",   href: "/admin/progress",    icon: <BarChart2  className="w-4 h-4" />, tour: "admin-progress"   },
  { label: "Settings",             href: "/admin/settings",    icon: <Settings   className="w-4 h-4" />, tour: "admin-settings"   },
];

// ── Shared props ──────────────────────────────────────────────────────────────

interface AppSidebarProps {
  isAdmin: boolean;
  canManageLessons: boolean;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
}

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-4 h-4 text-white" />
      </div>
      <div>
        <div className="font-bold text-gray-900 text-sm leading-tight">WSO Knowledge</div>
        <div className="text-xs text-gray-400 leading-tight">Work Station Office</div>
      </div>
    </div>
  );
}

// ── Desktop sidebar nav links ─────────────────────────────────────────────────

function DesktopNavLinks({ isAdmin, canManageLessons, pathname }: { isAdmin: boolean; canManageLessons: boolean; pathname: string }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {employeeNav.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} data-tour={item.tour}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            {item.icon}{item.label}
          </Link>
        );
      })}

      {(isAdmin || canManageLessons) && (
        <>
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isAdmin ? "Admin" : "Content"}
            </p>
          </div>
          {(isAdmin ? adminNav : adminNav.filter((i) => i.href === "/admin/lessons")).map((item) => (
            <Link key={item.href} href={item.href} data-tour={item.tour}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {item.icon}{item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}

// ── Mobile bottom navigation ──────────────────────────────────────────────────

// Employee: Dashboard · My Path · Lessons · Profile
// Admin:    Dashboard · Lessons · Employees · Progress · More↑
function MobileBottomNav({
  isAdmin, canManageLessons, pathname, initials, userName, userEmail, userAvatarUrl,
}: {
  isAdmin: boolean;
  canManageLessons: boolean;
  pathname: string;
  initials: string;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: "/sign-in" });
  };

  // The four primary tabs shared by everyone
  const baseTabs = isAdmin
    ? [
        { label: "Dashboard", href: "/",               icon: LayoutDashboard, exact: true  },
        { label: "Lessons",   href: "/admin/lessons",  icon: BookOpen,        exact: false },
        { label: "Employees", href: "/admin/employees",icon: Users,           exact: false },
        { label: "Progress",  href: "/admin/progress", icon: BarChart2,       exact: false },
      ]
    : canManageLessons
    ? [
        { label: "Home",    href: "/",              icon: LayoutDashboard, exact: true  },
        { label: "My Path", href: "/my-path",       icon: Route,           exact: false },
        { label: "Manage",  href: "/admin/lessons", icon: Shield,          exact: false },
        { label: "Lessons", href: "/lessons",       icon: BookOpen,        exact: false },
        { label: "Saved",   href: "/watch-later",   icon: Bookmark,        exact: false },
      ]
    : [
        { label: "Home",    href: "/",            icon: LayoutDashboard, exact: true  },
        { label: "My Path", href: "/my-path",     icon: Route,           exact: false },
        { label: "Lessons", href: "/lessons",     icon: BookOpen,        exact: false },
        { label: "Saved",   href: "/watch-later", icon: Bookmark,        exact: false },
        { label: "Profile", href: "/profile",     icon: UserCircle,      exact: false },
      ];

  // "More" is active if current page is one of the overflow items (admin only)
  const moreActive = isAdmin && [
    "/admin/positions", "/admin/groups", "/admin/settings", "/admin/categories", "/profile",
  ].some((p) => pathname.startsWith(p));

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex h-16">
        {baseTabs.map(({ label, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Admin "More" tab */}
        {isAdmin && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                moreActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0">
              {/* User info */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName} />}
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{userName}</p>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
              </div>

              {/* Overflow admin links */}
              <nav className="py-2">
                {[
                  { label: "Positions & Templates", href: "/admin/positions", icon: Route    },
                  { label: "Manage Groups",          href: "/admin/groups",    icon: Shield   },
                  { label: "Settings",               href: "/admin/settings",  icon: Settings },
                ].map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors",
                      pathname.startsWith(href)
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />{label}
                  </Link>
                ))}

                <div className="mx-5 my-1 border-t border-gray-100" />

                <Link href="/profile"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors",
                    pathname === "/profile"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <UserCircle className="w-4 h-4 flex-shrink-0" />My Profile
                </Link>

                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  {signingOut
                    ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                    : <LogOut className="w-4 h-4 flex-shrink-0" />}
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </nav>

              {/* Safe-area spacer */}
              <div className="h-safe-area-inset-bottom" />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AppSidebar({ isAdmin, canManageLessons, userName, userEmail, userAvatarUrl }: AppSidebarProps) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: "/sign-in" });
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 min-h-screen bg-white border-r border-gray-200 flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-gray-100">
          <Logo />
        </div>

        <DesktopNavLinks isAdmin={isAdmin} canManageLessons={canManageLessons} pathname={pathname} />

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3" data-tour="user-profile">
            <Avatar className="w-8 h-8 flex-shrink-0">
              {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName} />}
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
          <TourGuide isAdmin={isAdmin} />
          <Link
            href="/profile"
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === "/profile"
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <UserCircle className="w-3.5 h-3.5" />My Profile
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
          >
            {signingOut
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <LogOut className="w-3.5 h-3.5" />}
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 h-14 flex items-center px-4">
        <Link href="/"><Logo /></Link>

        {/* Sign-out for non-admin (admin gets it in the More sheet) */}
        {!isAdmin && (
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="ml-auto p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
            aria-label="Sign out"
          >
            {signingOut
              ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              : <LogOut className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* ── Mobile bottom navigation ───────────────────────────── */}
      <MobileBottomNav
        isAdmin={isAdmin}
        canManageLessons={canManageLessons}
        pathname={pathname}
        initials={initials}
        userName={userName}
        userEmail={userEmail}
        userAvatarUrl={userAvatarUrl}
      />
    </>
  );
}
