"use client";
import { Button } from "@/components/ui/button";

export function SubmitBar({
  primaryLabel = "Enviar",
  secondaryLabel,
  loading = false,
  onPrimary,
  onSecondary,
}: {
  primaryLabel?: string;
  secondaryLabel?: string;
  loading?: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 mt-6 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-end gap-3 border-t px-2 py-3 sm:px-0">
        {secondaryLabel && (
          <Button variant="secondary" onClick={onSecondary} disabled={loading}>
            {secondaryLabel}
          </Button>
        )}
        <Button onClick={onPrimary} disabled={loading}>
          {loading ? "Enviando..." : primaryLabel}
        </Button>
      </div>
    </div>
  );
}
