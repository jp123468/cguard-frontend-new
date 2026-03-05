import React from 'react';

type MobileCardListProps<T> = {
    items: T[];
    renderCard: (item: T) => React.ReactNode;
    loading?: boolean;
    emptyMessage?: string;
};

export default function MobileCardList<T>({ items, renderCard, loading, emptyMessage }: MobileCardListProps<T>) {
    if (loading) return <div className="p-4 bg-white rounded text-center">Cargando...</div>;
    if (!items || items.length === 0) return <div className="p-4 bg-white rounded text-center text-muted-foreground">{emptyMessage || 'No hay elementos'}</div>;

    return (
        <div className="space-y-3">
            {items.map((it: any) => (
                <div key={it.id || it._id || JSON.stringify(it)} className="bg-white rounded-lg border p-3 flex flex-col gap-2">
                    {renderCard(it)}
                </div>
            ))}
        </div>
    );
}
