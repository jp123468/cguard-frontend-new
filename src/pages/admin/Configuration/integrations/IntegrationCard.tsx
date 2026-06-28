import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/kit";
import { cn } from "@/lib/utils";

type Props = {
  image: string;
  title: string;
  subtitle?: string;
  active?: boolean;
  href: string;
};

export default function IntegrationCard({ image, title, subtitle, active, href }: Props) {
  return (
    <div className="cg-card cg-card-hover flex h-full flex-col items-center justify-between gap-3 p-6">
      <div className="flex min-h-[28px] w-full items-start justify-end">
        {active && <StatusBadge tone="green">Activo</StatusBadge>}
      </div>

      <div className="flex flex-1 items-center justify-center py-2">
        <img src={image} className="h-10 object-contain" alt={title} />
      </div>

      <div className={cn("w-full border-t pt-3")}>
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-xs font-semibold text-primary">{subtitle ?? title}</div>
          <Button variant="ghost" size="icon" asChild>
            <Link to={href} aria-label={`Gestionar ${subtitle ?? title}`}>
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
