"use client";

import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: _session } = useSession();

  return <DashboardLayout>{children}</DashboardLayout>;
}

