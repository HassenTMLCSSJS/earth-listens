import type { ButtonHTMLAttributes } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`magnetic bg-accent text-space-950 inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 font-medium ${className}`}
      {...props}
    />
  );
}
