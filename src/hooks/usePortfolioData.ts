import { useCallback, useMemo } from 'react';
import portfolioMap from '../work_list/portfolioMap.json';
import portfolioRoutes from '../work_list/portfolioRoutes.json';
import workDetails from '../work_list/allWorkData.json';
import {
  PortfolioCategory,
  PortfolioCategoryWithMatrix,
  PortfolioCode,
  PortfolioItem,
  PortfolioRouteConfig,
  PortfolioRouteEntry,
  CvRouteValue,
  CvSettings,
  WorkDetail,
} from '../types/portfolio';
import {
  WORK_IMAGE_MAP,
  createFallbackDetail,
} from '../utils/portfolioAssets';

const ROUTE_CONFIG = portfolioRoutes as PortfolioRouteConfig;
const DEFAULT_ROUTE_ENTRY: PortfolioRouteEntry = ROUTE_CONFIG.default ?? {};
const loadCvAssets = (): Record<string, string> => {
  try {
    const context = require.context('../asset/cv', false, /\.pdf$/);
    return context.keys().reduce<Record<string, string>>((acc, key) => {
      const assetKey = key.replace('./', '');
      try {
        acc[assetKey] = context(key) as string;
      } catch {
        // Skip missing assets so build continues even if files were removed.
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const CV_ASSETS = loadCvAssets();

const workDetailMap = workDetails as Record<string, WorkDetail>;

const getPortfolioName = (code: string): string | undefined =>
  portfolioMap[code as keyof typeof portfolioMap];

const defaultCodes = Object.keys(portfolioMap).sort((a, b) =>
  a.localeCompare(b),
);

const buildCategories = (
  source: Record<string, PortfolioCode[]> | undefined,
): PortfolioCategory[] => {
  if (!source) {
    return [];
  }

  const normalized = new Map(
    defaultCodes.map((code) => [code.toLowerCase(), code]),
  );

  const globalSeen = new Set<string>();
  const result: PortfolioCategory[] = [];

  Object.entries(source).forEach(([categoryName, codes = []]) => {
    if (!Array.isArray(codes)) {
      return;
    }

    const items: PortfolioItem[] = [];
    codes.forEach((rawCode) => {
      const lookupKey = rawCode.trim().toLowerCase();
      const resolved = normalized.get(lookupKey);
      if (!resolved || globalSeen.has(resolved)) {
        return;
      }
      const name = getPortfolioName(resolved);
      if (!name) {
        return;
      }
      const detail = workDetailMap[resolved] ?? createFallbackDetail(name);
      globalSeen.add(resolved);
      items.push({
        code: resolved,
        name,
        category: categoryName,
        detail,
      });
    });

    if (items.length) {
      result.push({ name: categoryName, items });
    }
  });

  return result;
};

const normaliseCvRoute = (
  config: CvRouteValue | undefined,
): { asset?: string; link?: string; groups?: string[] } => {
  if (!config) {
    return {};
  }
  if (typeof config === 'string') {
    return { asset: config.trim() || undefined };
  }
  const asset = config.asset?.trim() || undefined;
  const link = config.link?.trim() || undefined;
  const sourceGroups = Array.isArray(config.showGroups)
    ? config.showGroups
    : Array.isArray(config.showTypes)
    ? config.showTypes
    : undefined;
  const groups = sourceGroups
    ? Array.from(
        new Set(
          sourceGroups
            .map((item) => item?.trim())
            .filter((item): item is string => Boolean(item)),
        ),
      )
    : undefined;
  return { asset, link, groups };
};

const normaliseGroupList = (groups?: string[] | null): string[] | null => {
  if (!groups || groups.length === 0) {
    return null;
  }
  const cleaned = groups
    .map((group) => group?.trim())
    .filter((group): group is string => Boolean(group));
  if (!cleaned.length) {
    return null;
  }
  return Array.from(new Set(cleaned));
};

export const usePortfolioData = (routeKey: string) => {
  const currentEntry = useMemo<PortfolioRouteEntry>(
    () => ROUTE_CONFIG[routeKey] ?? {},
    [routeKey],
  );
  const defaultCvConfig = useMemo(
    () => normaliseCvRoute(DEFAULT_ROUTE_ENTRY.cv),
    [],
  );

  const categories = useMemo<PortfolioCategory[]>(() => {
    let resolvedCategories = buildCategories(currentEntry.categories);

    if (!resolvedCategories.length && currentEntry !== DEFAULT_ROUTE_ENTRY) {
      resolvedCategories = buildCategories(DEFAULT_ROUTE_ENTRY.categories);
    }

    if (!resolvedCategories.length) {
      const fallbackItems = defaultCodes
        .map((code) => {
          const name = getPortfolioName(code);
          if (!name) {
            return null;
          }
          return {
            code,
            name,
            category: '作品集',
          };
        })
        .filter((item): item is PortfolioItem => item !== null);

      return fallbackItems.length
        ? [
            {
              name: '作品集',
              items: fallbackItems.map((item) => ({
                ...item,
                detail: workDetailMap[item.code] ?? createFallbackDetail(item.name),
              })),
            },
          ]
        : [];
    }

    return resolvedCategories;
  }, [currentEntry]);

  const categoriesWithMatrix = useMemo<PortfolioCategoryWithMatrix[]>(
    () =>
      categories.map((category) => ({
        ...category,
        itemsMap: category.items.reduce<Record<string, PortfolioItem>>(
          (acc, item) => {
            acc[item.code] = item;
            return acc;
          },
          {},
        ),
      })),
    [categories],
  );

  const portfolioItems = useMemo(() => {
    const seen = new Set<string>();
    return categoriesWithMatrix
      .flatMap((category) => category.items)
      .filter((item) => {
        if (seen.has(item.code)) {
          return false;
        }
        seen.add(item.code);
        return true;
      });
  }, [categoriesWithMatrix]);

  const getYearRangeText = useCallback((detail: WorkDetail): string => {
    const start = (detail.yearBegin || '').trim();
    const end = (detail.yearEnd || '').trim();
    if (start && end && start !== end) {
      return `${start} – ${end}`;
    }
    return start || end || '';
  }, []);

const cvSettings = useMemo<CvSettings>(() => {
  const currentConfig = normaliseCvRoute(currentEntry.cv);

  const resolvedAssetKey =
    currentConfig.asset ??
    defaultCvConfig.asset ??
    (typeof DEFAULT_ROUTE_ENTRY.cv === 'string'
      ? DEFAULT_ROUTE_ENTRY.cv
      : undefined);

  const downloadUrl =
    resolvedAssetKey && CV_ASSETS[resolvedAssetKey]
      ? CV_ASSETS[resolvedAssetKey]
      : null;

  const resolvedLink =
    currentConfig.link ?? defaultCvConfig.link ?? null;

    const resolvedGroups =
      normaliseGroupList(currentConfig.groups) ??
      normaliseGroupList(defaultCvConfig.groups) ??
      null;

    return {
      downloadUrl,
      link: resolvedLink,
      groups: resolvedGroups,
    };
  }, [currentEntry, defaultCvConfig]);

  return {
    categories,
    categoriesWithMatrix,
    portfolioItems,
    workDetailMap,
    workImageMap: WORK_IMAGE_MAP,
    getYearRangeText,
    cvSettings,
  };
};
