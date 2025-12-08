import React from "react";
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const location = useLocation();

  // Si no se pasan items, generamos a partir de la URL actual
  const paths = location.pathname.split("/").filter(Boolean);
  const generatedItems =
    items ||
    paths.map((segment, index) => ({
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      path: "/" + paths.slice(0, index + 1).join("/"),
    }));

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-6">
      <ol className="flex items-center text-sm">
        {generatedItems.map((item, index) => {
          const isLast = index === generatedItems.length - 1;
          return (
            <li key={index} className="flex items-center">
              {!isLast ? (
                <Link
                  to={item.path || "#"}
                  className="text-[#FE6F02] font-medium hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold text-[#0B1F38]">
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
