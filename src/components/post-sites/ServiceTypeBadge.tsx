import React, { useState } from 'react';
import { Shield, BellElectric, Camera, Car, Lock, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServiceType, SERVICE_TYPES } from '@/lib/serviceTypes';
import type { ServiceTypeValue } from '@/lib/serviceTypes';
import { Input } from '@/components/ui/input';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  BellAlert: BellElectric,
  Camera,
  Car,
  Lock,
};

interface ServiceTypeBadgeProps {
  value?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export function ServiceTypeBadge({ value, className, size = 'sm' }: ServiceTypeBadgeProps) {
  const def = getServiceType(value);
  if (!value) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 text-gray-500 font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}>
        Sin tipo
      </span>
    );
  }

  if (!def) {
    // Custom type – display the raw value
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 text-gray-600 font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}>
        <Tag className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        {value}
      </span>
    );
  }

  const Icon = ICONS[def.icon] ?? Shield;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      def.badgeBg, def.badgeText, def.borderColor,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      className,
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {def.label}
    </span>
  );
}

interface ServiceTypePickerProps {
  value?: ServiceTypeValue | null;
  onChange: (value: string) => void;
  error?: string;
}

export function ServiceTypePicker({ value, onChange, error }: ServiceTypePickerProps) {
  const isKnownType = !!value && SERVICE_TYPES.some((st) => st.value === value);
  const [isOther, setIsOther] = useState(!isKnownType && !!value);
  const [customText, setCustomText] = useState(!isKnownType && value ? value : '');

  const handleSelectKnown = (val: string) => {
    setIsOther(false);
    onChange(val);
  };

  const handleSelectOther = () => {
    setIsOther(true);
    onChange(customText);
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    onChange(text);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SERVICE_TYPES.map((st) => {
          const Icon = ICONS[st.icon] ?? Shield;
          const isSelected = !isOther && value === st.value;

          return (
            <button
              key={st.value}
              type="button"
              onClick={() => handleSelectKnown(st.value)}
              className={cn(
                'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all duration-150 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8860A]',
                isSelected
                  ? [st.color, st.borderColor, 'shadow-sm ring-1', st.borderColor.replace('border-', 'ring-')]
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <span className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                isSelected ? [st.color, st.textColor] : 'bg-gray-100 text-gray-500',
              )}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className={cn(
                  'block text-sm font-semibold',
                  isSelected ? st.textColor : 'text-gray-900',
                )}>
                  {st.label}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500 leading-relaxed">
                  {st.description}
                </span>
              </span>
            </button>
          );
        })}

        {/* Custom / "Otro" option */}
        <button
          type="button"
          onClick={handleSelectOther}
          className={cn(
            'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all duration-150 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8860A]',
            isOther
              ? 'border-gray-400 bg-gray-50 shadow-sm ring-1 ring-gray-400'
              : 'border-gray-200 bg-white hover:border-gray-300',
          )}
        >
          <span className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            isOther ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-500',
          )}>
            <Tag className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className={cn('block text-sm font-semibold', isOther ? 'text-gray-700' : 'text-gray-900')}>
              Otro...
            </span>
            <span className="mt-0.5 block text-xs text-gray-500 leading-relaxed">
              Especifique un tipo de servicio personalizado.
            </span>
          </span>
        </button>
      </div>

      {isOther && (
        <Input
          placeholder="Ej. Gestión de acceso, Seguridad industrial, Vigilancia VIP..."
          value={customText}
          onChange={(e) => handleCustomTextChange(e.target.value)}
          maxLength={50}
          className="mt-2"
          autoFocus
        />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
