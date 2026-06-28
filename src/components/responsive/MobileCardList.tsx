import React from 'react';

type MobileCardListProps<T> = {
    items: T[];
    renderCard: (item: T) => React.ReactNode;
    loading?: boolean;
    emptyMessage?: string;
};

export default function MobileCardList<T>({ items, renderCard, loading, emptyMessage }: MobileCardListProps<T>) {
    if (loading) return <div className="p-6 bg-card rounded-2xl border shadow-sm text-center text-sm text-muted-foreground">Cargando…</div>;
    if (!items || items.length === 0) return <div className="p-6 bg-card rounded-2xl border border-dashed text-center text-sm text-muted-foreground">{emptyMessage || 'No hay elementos'}</div>;

    return (
        <div className="space-y-3 cg-stagger">
            {items.map((it: any) => (
                <div key={it.id || it._id || JSON.stringify(it)} className="bg-card rounded-2xl border shadow-sm hover-lift p-4 flex flex-col gap-2">
                    {renderCard(it)}
                </div>
            ))}
        </div>
    );
}
