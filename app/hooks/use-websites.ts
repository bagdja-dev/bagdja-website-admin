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

export function useWebsites() {
  const [websites, setWebsites] = useState<UserWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWebsite, setActiveWebsite] = useState<UserWebsite | null>(null);

  useEffect(() => {
    // Call admin BFF route — reads httpOnly bw_token server-side
    fetch('/api/user/websites')
      .then(async (r) => {
        if (!r.ok) return [];
        return r.json() as Promise<UserWebsite[]>;
      })
      .then((data) => {
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
