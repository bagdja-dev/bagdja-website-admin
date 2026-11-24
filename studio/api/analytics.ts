import { studioRequest, websitePath } from './client';

export interface WebsiteAnalyticsOverview {
  days: 7 | 30 | 90;
  summary: {
    pageViews: number;
    uniqueVisitors: number;
    ctaClicks: number;
  };
  daily: Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    ctaClicks: number;
  }>;
  topPages: Array<{ label: string; count: number }>;
  topSources: Array<{ label: string; count: number }>;
  topCtas: Array<{ label: string; count: number }>;
}

export function fetchWebsiteAnalytics(websiteId: string, days: 7 | 30 | 90): Promise<WebsiteAnalyticsOverview> {
  return studioRequest<WebsiteAnalyticsOverview>(`${websitePath(websiteId, '/analytics')}?days=${days}`);
}
