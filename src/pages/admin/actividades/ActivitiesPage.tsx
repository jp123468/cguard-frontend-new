import Breadcrumb from "@/components/ui/breadcrumb";
import AppLayout from "@/layouts/app-layout";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Funnel, CheckCheck } from "lucide-react";
import { useState } from "react";

export default function ActivitiesPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: t('dashboard.title'), path: "/dashboard" },
          { label: t('activity.title') },
        ]}
      />

      <div className="p-6">
        {/* Barra de acciones */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            className="text-orange-600 border-orange-200 hover:text-orange-700"
            onClick={() => console.log(t('activity.markAllRead'))}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {t('activity.markAllRead')}
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Funnel className="mr-2 h-4 w-4" />
                {t('activity.filters')}
              </Button>
            </SheetTrigger>

            {/* Panel lateral de filtros */}
              <SheetContent side="right" className="w-[420px] sm:w-[520px]">
              <SheetHeader>
                <SheetTitle>{t('activity.filters')}</SheetTitle>
              </SheetHeader>

              <div className="mt-4">
                <Tabs defaultValue="filters">
                    <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="filters">{t('activity.filters')}</TabsTrigger>
                    <TabsTrigger value="saved" disabled>{t('activity.savedFilters')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="filters" className="mt-4 space-y-4">
                    {/* Cliente */}
                    <div className="space-y-2">
                      <Label>{t('activity.filter.client')}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={t('activity.filter.client')} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* sin datos — solo UI */}
                          <SelectItem value="any">{t('activity.any')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sitio de publicación */}
                    <div className="space-y-2">
                      <Label>{t('activity.filter.postSite')}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={t('activity.filter.postSite')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t('activity.any')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Guardia */}
                    <div className="space-y-2">
                      <Label>{t('activity.filter.guard')}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={t('activity.filter.guard')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t('activity.any')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tipo */}
                    <div className="space-y-2">
                      <Label>{t('activity.filter.type')}</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder={t('activity.filter.type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t('activity.filter.type.all')}</SelectItem>
                          <SelectItem value="check-in">{t('activity.filter.type.checkin')}</SelectItem>
                          <SelectItem value="check-out">{t('activity.filter.type.checkout')}</SelectItem>
                          <SelectItem value="incident">{t('activity.filter.type.incident')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rango de fechas: DESDE */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('activity.filter.dateFrom')}</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('activity.filter.time')}*</Label>
                        <Input type="time" defaultValue="00:00" />
                      </div>
                    </div>

                    {/* Rango de fechas: HASTA */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('activity.filter.dateTo')}</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('activity.filter.time')}*</Label>
                        <Input type="time" defaultValue="23:59" />
                      </div>
                    </div>

                    {/* Archivados */}
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox id="archived" />
                      <Label htmlFor="archived" className="font-normal">
                        {t('activity.filter.showArchived')}
                      </Label>
                    </div>

                    {/* Acciones */}
                    <div className="space-y-2 pt-2">
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        onClick={() => {
                          console.log(t('activity.filter.apply'));
                          setOpen(false);
                        }}
                      >
                        {t('activity.filter.apply')}
                      </Button>
                      {/* Sin “Guardar Filtro” como pediste */}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Estado vacío */}
          <div className="flex flex-col items-center justify-center h-[70vh] text-center">
          <img
            src="https://app.guardspro.com/assets/icons/custom/no-data-found.png"
            className="h-40 mb-4"
            alt={t('activity.empty.alt')}
          />
          <h3 className="text-2xl font-semibold text-gray-800">
            {t('activity.noResults.title')}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            {t('activity.noResults.description')}
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
