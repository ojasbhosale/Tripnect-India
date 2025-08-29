// components/ClientWrapper.tsx
"use client";

import React from "react";
import NavbarWrapper from "@/components/navbar-wrapper";
import AuthGuard from "@/components/AuthGuard";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <NavbarWrapper />
      {children}
    </AuthGuard>
  );
}
