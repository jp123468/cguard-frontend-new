import React from "react";
import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AppLayout from "@/layouts/app-layout";
import { REPORT_SECTIONS } from "@/config/reports-config";

interface ReportsProps {
  onNavigate?: (href: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
  const navigate = useNavigate();

  const handleNavigate = (href?: string) => {
    if (!href) return;
    if (onNavigate) {
      onNavigate(href);
    } else {
      navigate(href);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 lg:p-8 p-4">
        {REPORT_SECTIONS.map((section) => (
          <section
            key={section.id}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
          >
            {/* HEADER SECCIÓN */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-slate-900">
                {section.title}
              </h2>

              <div className="flex items-center gap-3">
                {/* Botón de configuración: SOLO si settingsHref existe */}
                {section.settingsHref && (
                  <button
                    type="button"
                    title="Configuración"
                    onClick={() => handleNavigate(section.settingsHref)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}

                {/* Botón Ver Todo: SOLO si viewAllHref existe */}
                {section.viewAllHref && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex h-10 items-center gap-1 px-3 text-sm font-semibold text-orange-500 hover:bg-orange-50"
                    onClick={() => handleNavigate(section.viewAllHref)}
                  >
                    Ver Todo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* GRID DE CARDS */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {section.reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => handleNavigate(report.href)}
                  className="text-left"
                >
                  <Card className="h-full rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-[1px] hover:shadow-md">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-900">
                        {report.title}
                      </CardTitle>

                      {(report.openCount !== undefined ||
                        report.closedCount !== undefined) && (
                          <div className="flex gap-1">
                            {report.openCount !== undefined && (
                              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-orange-50 px-1 text-xs font-semibold text-orange-500">
                                {report.openCount}
                              </span>
                            )}
                            {report.closedCount !== undefined && (
                              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-50 px-1 text-xs font-semibold text-red-500">
                                {report.closedCount}
                              </span>
                            )}
                          </div>
                        )}
                    </CardHeader>

                    <CardContent>
                      <p className="text-xs text-slate-500">
                        {report.description}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  );
};

export default Reports;
