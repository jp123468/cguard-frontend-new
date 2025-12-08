"use client";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function FormErrorSummary({ hasErrors }: { hasErrors: boolean }) {
  if (!hasErrors) return null;
  return (
    <Alert variant="destructive" className="mt-2">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>Revisa los campos marcados</AlertTitle>
      <AlertDescription>Faltan datos o hay valores inválidos.</AlertDescription>
    </Alert>
  );
}
