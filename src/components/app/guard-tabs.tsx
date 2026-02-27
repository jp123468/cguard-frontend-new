"use client";
import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from 'react-i18next'

type Props = {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
};

export function GuardTabsHeader({ value, onValueChange, children }: Props) {
  const { t } = useTranslation()
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <div className="sticky top-0 z-10 backdrop-blur">
        <TabsList className="h-auto w-full justify-start gap-1 mt-5 overflow-x-auto border-b bg-transparent p-0">
          <TabsTrigger value="invite" className=" px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary">
            {t('guards.tabs.invite')}
          </TabsTrigger>
         {/* <TabsTrigger value="join_code" className=" px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Unirse por Código
          </TabsTrigger>
          <TabsTrigger value="invite_link" className=" px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Invitar Usando Enlace
          </TabsTrigger>*/}
          <TabsTrigger value="create_profile" className=" px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary">
            {t('guards.tabs.create_profile')}
          </TabsTrigger>
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}
