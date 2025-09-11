"use client";
import { ServiceTypeSelector } from "@/components/service-type-selector";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background py-12 px-4">
      <ServiceTypeSelector />
    </div>
  );
}
