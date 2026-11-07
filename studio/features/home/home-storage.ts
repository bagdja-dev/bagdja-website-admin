import { readStorage, writeStorage } from '@/studio/lib/storage';

const key = (name: string, websiteId: string): string => `studio_home_${name}:${websiteId}`;

/** "Sembunyikan panduan" disimpan per website di browser (try/catch di storage helper). */
export const homeStorage = {
  isGuideHidden: (websiteId: string): boolean => readStorage(key('guide_hidden', websiteId)) === '1',
  setGuideHidden: (websiteId: string, hidden: boolean): void => writeStorage(key('guide_hidden', websiteId), hidden ? '1' : '0'),
};
