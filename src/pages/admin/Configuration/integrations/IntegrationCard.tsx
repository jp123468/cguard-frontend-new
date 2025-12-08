import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  image: string;
  title: string;
  subtitle?: string;
  active?: boolean;
  href: string;
};

export default function IntegrationCard({ image, title, subtitle, active, href }: Props) {
  return (
    <Card className="flex flex-col items-center justify-between px-6 py-6 shadow-none">
      {active && (
        <Badge className="bg-emerald-500 hover:bg-emerald-500">Activo</Badge>
      )}

      <div className="py-2">
        <img src={image} className="h-10" alt="" />
      </div>
      <div className="w-full border-t py-1">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-center text-orange-600">{subtitle ?? title}</div>
          <Button variant="ghost" size="icon" asChild>
            <Link to={href} aria-label={`Gestionar ${subtitle ?? title}`}>
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
