"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BookOpen, LayoutDashboard, Users, Shield, Route, LogOut, Settings, Menu, BarChart2, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TourGuide } from "@/components/tour-guide";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="w-4 h-4" />, exact: true, tour: "dashboard" },
  { label: "My Training Path", href: "/my-path", icon: <Route className="w-4 h-4" />, exact: false, tour: "my-path" },
  { label: "All Lessons", href: "/lessons", icon: <BookOpen className="w-4 h-4" />, exact: false, tour: "all-lessons" },
];

const adminNav = [
  { label: "Manage Lessons", href: "/admin/lessons", icon: <BookOpen className="w-4 h-4" />, tour: "admin-lessons" },
  { label: "Positions & Templates", href: "/admin/positions", icon: <Route className="w-4 h-4" />, tour: "admin-positions" },
  { label: "Manage Groups", href: "/admin/groups", icon: <Shield className="w-4 h-4" />, tour: "admin-groups" },
  { label: "Employees", href: "/admin/employees", icon: <Users className="w-4 h-4" />, tour: "admin-employees" },
  { label: "Progress Dashboard", href: "/admin/progress", icon: <BarChart2 className="w-4 h-4" />, tour: "admin-progress" },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" />, tour: "admin-settings" },
];

interface AppSidebarProps {
  isAdmin: boolean;
  userName: string;
  userEmail: string;
}

function NavLinks({ isAdmin, pathname, onNavigate }: { isAdmin: boolean; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {nav.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href}
            data-tour={item.tour}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}

      {isAdmin && (
        <>
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
          </div>
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href}
              data-tour={item.tour}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}

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

export function AppSidebar({ isAdmin, userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname();

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 min-h-screen bg-white border-r border-gray-200 flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <Logo />
        </div>

        <NavLinks isAdmin={isAdmin} pathname={pathname} />

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3" data-tour="user-profile">
            <Avatar className="w-8 h-8 flex-shrink-0">
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
            <UserCircle className="w-3.5 h-3.5" />
            My Profile
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ─────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4">
        <Link href="/"><Logo /></Link>

        <Sheet>
          <SheetTrigger className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            {/* Logo inside drawer */}
            <div className="px-6 py-5 border-b border-gray-100">
              <Logo />
            </div>

            <NavLinks isAdmin={isAdmin} pathname={pathname} />

            {/* User section inside drawer */}
            <div className="px-4 py-4 border-t border-gray-100 mt-auto">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
              </div>
              <Link
                href="/profile"
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === "/profile"
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <UserCircle className="w-3.5 h-3.5" />
                My Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
