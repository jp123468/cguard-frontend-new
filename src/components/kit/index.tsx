/**
 * ════════════════════════════════════════════════════════════════════════════
 * C-GUARD PRO — REUSABLE UI KIT
 * The single source of layout + motion building blocks. Import from '@/components/kit'.
 * See /style-guide for a live gallery and memory/design-system.md for the spec.
 * Compose these instead of writing ad-hoc cards/headers/empty states.
 * ════════════════════════════════════════════════════════════════════════════
 */
import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ── Motion primitives ───────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + rise in. Wrap any block; optional `delay`. */
export function FadeIn({ children, delay = 0, y = 12, className, ...rest }: { children: React.ReactNode; delay?: number; y?: number } & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Stagger children in sequence. Each direct child should be a <motion.div> or use <FadeIn>. */
export function Stagger({ children, className, gap = 0.06 }: { children: React.ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {React.Children.map(children, (child, i) => (
        <motion.div key={i} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── PageContainer ───────────────────────────────────────────────────────────
/** Standard page width + vertical rhythm. Wrap every page's content. */
export function PageContainer({ children, className, width = 'default' }: { children: React.ReactNode; className?: string; width?: 'default' | 'wide' | 'narrow' }) {
  const w = width === 'wide' ? 'max-w-7xl' : width === 'narrow' ? 'max-w-3xl' : 'max-w-5xl';
  return <div className={cn('mx-auto w-full space-y-6 pb-16', w, className)}>{children}</div>;
}

// ── PageHeader (hero) ───────────────────────────────────────────────────────
/** The standard page hero: gradient surface, icon tile, title/subtitle, actions. */
export function PageHeader({ title, subtitle, icon, actions, badges, className }: {
  title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode;
  actions?: React.ReactNode; badges?: React.ReactNode; className?: string;
}) {
  return (
    <FadeIn className={cn('cg-gradient-hero relative overflow-hidden rounded-2xl border shadow-sm', className)}>
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
      <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        {icon && (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl cg-gradient-brand text-primary-foreground shadow-md [&_svg]:size-7">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </FadeIn>
  );
}

// ── Section card ────────────────────────────────────────────────────────────
/** The standard content surface. Title row + optional icon/action, then children. */
export function Section({ title, icon, action, children, className, contentClassName }: {
  title?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode;
  children: React.ReactNode; className?: string; contentClassName?: string;
}) {
  return (
    <div className={cn('cg-card cg-card-hover p-5', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
            {title && <h3 className="font-semibold text-sm tracking-tight truncate">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}

// ── StatCard ────────────────────────────────────────────────────────────────
const ACCENTS: Record<string, string> = {
  primary: 'bg-primary/12 text-primary',
  green: 'bg-green-500/12 text-green-600',
  blue: 'bg-blue-500/12 text-blue-600',
  red: 'bg-red-500/12 text-red-600',
  orange: 'bg-orange-500/12 text-orange-600',
  slate: 'bg-muted text-muted-foreground',
};

/** A KPI tile. Use in a grid (Stagger) for dashboards. */
export function StatCard({ label, value, icon, accent = 'primary', hint, className }: {
  label: React.ReactNode; value: React.ReactNode; icon?: React.ReactNode;
  accent?: keyof typeof ACCENTS; hint?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('cg-card cg-card-hover p-4 flex items-center gap-3', className)}>
      {icon && <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5', ACCENTS[accent])}>{icon}</div>}
      <div className="min-w-0">
        <div className="cg-eyebrow truncate">{label}</div>
        <div className="font-display text-xl font-bold leading-tight truncate">{value}</div>
        {hint && <div className="text-xs text-muted-foreground truncate">{hint}</div>}
      </div>
    </div>
  );
}

// ── Badge (status) ──────────────────────────────────────────────────────────
const TONES: Record<string, string> = {
  green: 'bg-green-500/15 text-green-700 dark:text-green-400',
  orange: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  red: 'bg-red-500/15 text-red-700 dark:text-red-400',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  primary: 'bg-primary/15 text-primary',
  slate: 'bg-muted text-foreground/60',
};
const DOTS: Record<string, string> = { green: 'bg-green-500', orange: 'bg-orange-500', red: 'bg-red-500', blue: 'bg-blue-500', primary: 'bg-primary', slate: 'bg-gray-400' };

/** Pill status badge with a leading dot. */
export function StatusBadge({ children, tone = 'slate', dot = true, className }: { children: React.ReactNode; tone?: keyof typeof TONES; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', TONES[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  );
}

// ── EmptyState ──────────────────────────────────────────────────────────────
/** Friendly empty state with an icon tile + optional CTA. */
export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 px-6 text-center', className)}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground [&_svg]:size-6">{icon}</div>}
      <div className="font-semibold text-sm">{title}</div>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Loading skeletons ───────────────────────────────────────────────────────
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('cg-skeleton h-4 w-full', className)} />;
}
/** Card placeholders while loading a list/grid. */
export function SkeletonCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="cg-card p-4 space-y-3">
          <div className="cg-skeleton h-10 w-10 rounded-xl" />
          <SkeletonBlock className="h-3 w-2/3" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
/** Standard modal: <Modal open title footer>…</Modal>. Wraps the upgraded Dialog. */
export function Modal({ open, onOpenChange, title, description, icon, children, footer, size = 'md' }: {
  open: boolean; onOpenChange: (o: boolean) => void; title?: React.ReactNode; description?: React.ReactNode;
  icon?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  const w = size === 'lg' ? 'sm:max-w-2xl' : size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(w, 'gap-0 p-0 overflow-hidden')}>
        {(title || icon) && (
          <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b p-5">
            {icon && <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary [&_svg]:size-5">{icon}</div>}
            <div className="min-w-0">
              {title && <DialogTitle className="text-base font-semibold truncate">{title}</DialogTitle>}
              {description && <DialogDescription className="text-xs">{description}</DialogDescription>}
            </div>
          </DialogHeader>
        )}
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <DialogFooter className="border-t bg-muted/30 p-4">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

// ── Field (read-only label/value) ───────────────────────────────────────────
export function Field({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="cg-eyebrow mb-0.5">{label}</div>
      <div className="font-medium text-sm text-foreground truncate">{value || '—'}</div>
    </div>
  );
}
