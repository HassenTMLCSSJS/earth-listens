'use client';

import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function SettingSwitch({
  label,
  checked,
  onCheckedChange,
  id,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  id?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="border-line flex min-h-16 items-center justify-between gap-5 border-t py-2.5">
      <Label htmlFor={inputId} className="text-ink text-[0.9375rem] leading-snug font-normal">
        {label}
      </Label>
      <Switch
        id={inputId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-gold data-[state=unchecked]:bg-space-600 [&_[data-slot=switch-thumb]]:data-[state=checked]:bg-on-gold h-7 w-12 border-0 [&_[data-slot=switch-thumb]]:size-6 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-[calc(100%-4px)] [&_[data-slot=switch-thumb]]:data-[state=unchecked]:translate-x-0.5"
      />
    </div>
  );
}
