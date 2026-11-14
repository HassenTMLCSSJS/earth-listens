'use client';

import * as Switch from '@radix-ui/react-switch';

export function SettingSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4">
      <span>{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-accent relative h-7 w-12 rounded-full bg-white/20"
      >
        <Switch.Thumb className="bg-ink block h-6 w-6 translate-x-0.5 rounded-full transition-transform data-[state=checked]:translate-x-5" />
      </Switch.Root>
    </label>
  );
}
