'use client';

import { useWebsiteContext } from '../context/website-context';

/** @deprecated Use useWebsiteContext instead */
export function useWebsites() {
  return useWebsiteContext();
}
