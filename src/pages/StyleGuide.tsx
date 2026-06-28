/**
 * /style-guide — living reference for the C-Guard Pro design system.
 * Shows the tokens, primitives and reusable kit. Keep this in sync with
 * memory/design-system.md. Open it to copy patterns instead of inventing new ones.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PageContainer, PageHeader, Section, StatCard, StatusBadge, EmptyState,
  SkeletonCards, Modal, Field, FadeIn, Stagger,
} from '@/components/kit';
import {
  Sparkles, Shield, Users, Activity, Bell, Plus, Inbox, Palette, Type, Square, Layers,
} from 'lucide-react';

const SWATCHES = ['background', 'card', 'primary', 'secondary', 'muted', 'accent', 'destructive', 'border'];

export default function StyleGuide() {
  const [modal, setModal] = useState(false);
  return (
    <div className="min-h-screen bg-background p-6">
      <PageContainer width="wide">
        <PageHeader
          icon={<Sparkles />}
          title="C-Guard Pro — Sistema de Diseño"
          subtitle="Tokens, primitivas y kit reutilizable · fuente Poppins · usa estos componentes en todas partes"
          badges={<><StatusBadge tone="primary">v1</StatusBadge><StatusBadge tone="green">Poppins</StatusBadge></>}
          actions={<Button variant="brand"><Sparkles /> Brand</Button>}
        />

        {/* Typography */}
        <Section title="Tipografía — Poppins" icon={<Type />}>
          <div className="space-y-2">
            <div className="font-display text-4xl font-extrabold tracking-tight">Display 800 · Seguridad sin límites</div>
            <h2 className="text-2xl font-bold">Heading 700</h2>
            <h3 className="text-lg font-semibold">Subtítulo 600</h3>
            <p className="text-sm text-foreground">Cuerpo 400 — el texto base de la plataforma.</p>
            <p className="cg-eyebrow">Eyebrow / etiqueta</p>
            <p className="cg-text-gradient text-2xl font-bold">Texto con degradado de marca</p>
          </div>
        </Section>

        {/* Colors */}
        <Section title="Colores / Tokens" icon={<Palette />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {SWATCHES.map((c) => (
              <div key={c} className="space-y-1.5">
                <div className="h-14 rounded-xl border shadow-sm" style={{ background: `var(--${c})` }} />
                <div className="text-[11px] font-medium text-muted-foreground">{c}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Botones" icon={<Square />}>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="brand"><Sparkles /> Brand</Button>
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="outline"><Plus /></Button>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges de estado" icon={<Activity />}>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="green">En servicio</StatusBadge>
            <StatusBadge tone="orange">Pendiente</StatusBadge>
            <StatusBadge tone="red">Vencida</StatusBadge>
            <StatusBadge tone="blue">Informativo</StatusBadge>
            <StatusBadge tone="primary">Marca</StatusBadge>
            <StatusBadge tone="slate">Neutro</StatusBadge>
          </div>
        </Section>

        {/* Stat cards */}
        <div>
          <p className="cg-eyebrow mb-2">StatCard (grid + stagger)</p>
          <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Users />} accent="primary" label="Vigilantes" value="248" hint="+12 este mes" />
            <StatCard icon={<Shield />} accent="green" label="En servicio" value="61" />
            <StatCard icon={<Activity />} accent="blue" label="Rondas hoy" value="1,204" />
            <StatCard icon={<Bell />} accent="orange" label="Alertas" value="3" />
          </Stagger>
        </div>

        {/* Inputs + fields */}
        <Section title="Inputs y campos" icon={<Layers />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><div className="cg-eyebrow mb-1">Etiqueta</div><Input placeholder="Escribe aquí…" /></div>
            <Field label="Campo de solo lectura" value="Valor mostrado" />
          </div>
        </Section>

        {/* Empty + loading */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Empty state"><EmptyState icon={<Inbox />} title="Sin registros todavía" description="Cuando agregues datos aparecerán aquí." action={<Button size="sm" variant="brand"><Plus /> Agregar</Button>} /></Section>
          <Section title="Loading (skeleton)"><SkeletonCards count={2} className="sm:grid-cols-2" /></Section>
        </div>

        {/* Modal */}
        <Section title="Modal" icon={<Square />} action={<Button variant="brand" onClick={() => setModal(true)}>Abrir modal</Button>}>
          <p className="text-sm text-muted-foreground">{'<Modal open title icon footer> … </Modal>'} — encabezado con ícono, cuerpo con scroll, pie con acciones.</p>
        </Section>

        <FadeIn delay={0.1} className="text-center text-xs text-muted-foreground py-4">
          Importa todo desde <code className="rounded bg-muted px-1.5 py-0.5">@/components/kit</code> · animaciones con <code className="rounded bg-muted px-1.5 py-0.5">FadeIn</code> / <code className="rounded bg-muted px-1.5 py-0.5">Stagger</code> o clases <code className="rounded bg-muted px-1.5 py-0.5">.animate-fade-up</code> / <code className="rounded bg-muted px-1.5 py-0.5">.cg-stagger</code>
        </FadeIn>
      </PageContainer>

      <Modal open={modal} onOpenChange={setModal} icon={<Bell />} title="Título del modal" description="Subtítulo opcional"
        footer={<><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button variant="brand" onClick={() => setModal(false)}>Confirmar</Button></>}>
        <div className="space-y-3">
          <Field label="Campo" value="Contenido del modal" />
          <Input placeholder="Un input dentro del modal" />
        </div>
      </Modal>
    </div>
  );
}
