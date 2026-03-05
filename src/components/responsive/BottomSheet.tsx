import React from 'react';

type BottomSheetProps = {
    children: React.ReactNode;
    className?: string;
};

export default function BottomSheet({ children, className = '' }: BottomSheetProps) {
    return (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center ${className}`}>
            <div className="fixed inset-0 bg-black opacity-40" />
            <div className="bg-white rounded-t-lg sm:rounded-lg shadow-lg w-full sm:max-w-md z-10 p-4 sm:p-6">
                {children}
            </div>
        </div>
    );
}
