'use client';

import { useEffect, useState } from 'react';

interface Website {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  is_active: boolean;
}

interface UserWebsite {
  website: Website;
  role: string;
  is_active: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)bw_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useWebsites() {
  const [websites, setWebsites] = useState<UserWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWebsite, setActiveWebsite] = useState<UserWebsite | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/user/websites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: UserWebsite[]) => {
        setWebsites(data);
        const savedId =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem('bw_active_website')
            : null;
        const found = data.find((w) => w.website.id === savedId);
        setActiveWebsite(found ?? data[0] ?? null);
      })
      .catch(() => setWebsites([]))
      .finally(() => setLoading(false));
  }, []);

  const switchWebsite = (websiteId: string) => {
    const found = websites.find((w) => w.website.id === websiteId);
    if (found) {
      setActiveWebsite(found);
      localStorage.setItem('bw_active_website', websiteId);
    }
  };

  return { websites, activeWebsite, switchWebsite, loading };
}
