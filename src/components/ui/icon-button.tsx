import type { ButtonHTMLAttributes } from 'react';

export function IconButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`magnetic inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 px-3 ${className}`}
      {...props}
    />
  );
}
