"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function PatientLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Redirecting to patient portal...</div>}>
      <PatientLoginRedirect />
    </Suspense>
  );
}

function PatientLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const phone = searchParams.get("phone");
    if (phone) {
      router.replace(`/portal?phone=${encodeURIComponent(phone)}`);
    } else {
      router.replace("/login?tab=patient");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
      Connecting to Patient Portal...
    </div>
  );
}
