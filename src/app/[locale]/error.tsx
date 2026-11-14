'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/state-card';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState reset={reset} />;
}
