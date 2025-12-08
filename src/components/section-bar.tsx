import { ReactNode } from "react";
import { Menu } from "lucide-react";

type Props = {
  title: string;
  right?: ReactNode;
  onHamburger?: () => void;
  className?: string;
};

export default function SectionBar({ title, right, onHamburger, className }: Props) {
  return (
    <div className={["sticky top-0 z-10 bg-white", className ?? ""].join(" ")}>
      <div className="h-12 flex items-center justify-between border-b border-gray-200 px-4">
        <div className="text-[15px] text-gray-400 truncate">{title}</div>
        <div className="flex items-center gap-2">
          {right}
          <button
            onClick={onHamburger}
            className="p-2 rounded hover:bg-gray-100 text-gray-600"
            aria-label="Mostrar/Ocultar menú"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
