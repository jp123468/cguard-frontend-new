"use client";
import { Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

export function Copyable({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="max-w-[70vw] truncate rounded-md border-2 border-dashed border-orange-400 px-6 py-3 text-lg font-medium">
        {text}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={async () => { await navigator.clipboard.writeText(text); toast.success("Copiado"); }}>
              <Clipboard className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copiar</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
