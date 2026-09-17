"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarWidth = collapsed ? 64 : 260;

  const { data: notifData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=1&unread=true");
      if (!res.ok) return { unreadCount: 0 };
      return res.json();
    },
    refetchInterval: 60000,
  });

  // Close mobile sidebar on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        unreadCount={notifData?.unreadCount ?? 0}
      />
      <TopBar
        onMenuClick={() => setMobileOpen(!mobileOpen)}
        sidebarWidth={sidebarWidth}
      />
      <main
        className="pt-16 min-h-screen transition-all duration-200"
        style={{ paddingLeft: `${sidebarWidth}px` }}
      >
        <div className="p-6 page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
