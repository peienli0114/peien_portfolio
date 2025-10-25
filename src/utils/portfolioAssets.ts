import { WorkDetail, WorkGalleryItem, WorkImages } from '../types/portfolio';

const context = require.context(
  '../asset/work',
  true,
  /\.(png|jpe?g|gif|svg|pdf)$/i,
);

export const WORK_IMAGE_MAP: Record<string, WorkImages> = (() => {
  const map: Record<string, WorkImages> = {};
  context.keys().forEach((key) => {
    const src = context(key) as string;
    const normalized = key.replace('./', '');
    const [folder, file] = normalized.split('/');
    if (!folder || !file) {
      return;
    }
    const code = folder.toLowerCase();
    if (!map[code]) {
      map[code] = { main: null, gallery: [], videos: [] };
    }
    const lowerFile = file.toLowerCase();
    if (
      lowerFile.startsWith('mainpic') ||
      lowerFile.startsWith('main.') ||
      lowerFile.startsWith('headpic')
    ) {
      map[code].main = src;
    } else {
      const type: WorkGalleryItem['type'] = lowerFile.endsWith('.pdf')
        ? 'pdf'
        : 'image';
      map[code].gallery.push({ type, src });
    }
  });
  return map;
})();

export const embedYouTube = (url: string): string => {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
  );
  if (!youtubeMatch) {
    return url;
  }
  return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
};

export const parseArray = (value?: string | string[]): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (error) {
    // fallback to newline split
  }
  return value
    .replace(/\r/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const resolvePreviewUrl = (path?: string): string | null => {
  const trimmed = (path || '').trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `${process.env.PUBLIC_URL}/${trimmed}`;
};

export const createFallbackDetail = (name: string): WorkDetail => ({
  tableName: name,
  fullName: name,
  intro: '',
  introList: [],
  headPic: '',
  tags: [],
});
