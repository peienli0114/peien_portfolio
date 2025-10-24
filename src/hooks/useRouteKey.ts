import { useMemo } from 'react';

export const useRouteKey = (): string =>
  useMemo(() => {
    if (typeof window === 'undefined') {
      return 'default';
    }

    const hashSegment = window.location.hash
      .replace(/^#\/?/, '')
      .replace(/^\/+|\/+$/g, '')
      .split('/')[0];

    if (hashSegment) {
      return hashSegment.toLowerCase();
    }

    const rawPath = window.location.pathname
      .replace(process.env.PUBLIC_URL || '', '')
      .replace(/^\/+|\/+$/g, '')
      .split('/')[0];

    return rawPath ? rawPath.toLowerCase() : 'default';
  }, []);
