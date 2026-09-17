"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search, Bell, Menu, User, LogOut, Settings, ChevronDown, X } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { ROLE_COLORS, ROLE_LABELS, Role } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface TopBarProps {
  onMenuClick: () => void;
  sidebarWidth: number;
}

interface SearchResult {
  type: string;
  id: string;
  name: string;
  subtitle?: string;
  href: string;
}

export default function TopBar({ onMenuClick, sidebarWidth }: TopBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const role = session?.user?.role as Role | undefined;

  // Search
  const { data: searchResults, isLoading: searchLoading } = useQuery<SearchResult[]>({
    queryKey: ["search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.results ?? [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 0,
  });

  // Notifications
  const { data: notifData } = useQuery({
    queryKey: ["notifications-preview"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=5&unread=true");
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount ?? 0;

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const handleSearchSelect = (href: string) => {
    router.push(href);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const groupedResults = searchResults?.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-16 z-30 bg-white border-b border-slate-200",
        "flex items-center px-4 gap-3"
      )}
      style={{ left: `${sidebarWidth}px`, transition: "left 200ms ease" }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Global Search */}
      <div className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients, appointments, invoices..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {searchOpen && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
            {searchLoading ? (
              <div className="p-4 text-sm text-slate-500 text-center">Searching...</div>
            ) : !groupedResults || Object.keys(groupedResults).length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">No results found for &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {type}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSearchSelect(item.href)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-900">{item.name}</div>
                      {item.subtitle && (
                        <div className="text-xs text-slate-500 mt-0.5">{item.subtitle}</div>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-blue-600 font-medium">{unreadCount} unread</span>
                )}
              </div>
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {notifData?.notifications?.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500 text-center">No new notifications</div>
                ) : (
                  notifData?.notifications?.map((n: {id: string; title: string; message: string; isRead: boolean; createdAt: string}) => (
                    <div key={n.id} className={cn("px-4 py-3 hover:bg-slate-50", !n.isRead && "bg-blue-50/50")}>
                      <div className="text-sm font-medium text-slate-900">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-xs text-slate-400 mt-1">{formatRelativeTime(n.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-slate-100">
                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile menu */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {session?.user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-slate-900 leading-tight max-w-[120px] truncate">
                {session?.user?.name}
              </div>
              <div className="text-xs text-slate-500 leading-tight">
                {ROLE_LABELS[role as Role] ?? role}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-sm font-semibold text-slate-900 truncate">{session?.user?.name}</div>
                <div className="text-xs text-slate-500 truncate">{session?.user?.email}</div>
                <div className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full inline-block mt-1",
                  ROLE_COLORS[role as Role] ?? "bg-gray-100 text-gray-600"
                )}>
                  {ROLE_LABELS[role as Role] ?? role}
                </div>
              </div>
              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
