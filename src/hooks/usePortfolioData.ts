import { useCallback, useMemo } from 'react';
import portfolioMap from '../work_list/portfolioMap.json';
import portfolioRoutes from '../work_list/portfolioRoutes.json';
import workDetails from '../work_list/allWorkData.json';
import defaultCvPdf from '../asset/cv/cv-ch1018.pdf';
import {
  PortfolioCategory,
  PortfolioCategoryWithMatrix,
  PortfolioCode,
  PortfolioItem,
  PortfolioRouteConfig,
  PortfolioRouteEntry,
  WorkDetail,
} from '../types/portfolio';
import {
  WORK_IMAGE_MAP,
  createFallbackDetail,
} from '../utils/portfolioAssets';

const ROUTE_CONFIG = portfolioRoutes as PortfolioRouteConfig;
const DEFAULT_ROUTE_ENTRY: PortfolioRouteEntry = ROUTE_CONFIG.default ?? {};
const DEFAULT_CV_KEY = 'cv-ch1018.pdf';
const CV_ASSETS: Record<string, string> = {
  [DEFAULT_CV_KEY]: defaultCvPdf,
};

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

export const usePortfolioData = (routeKey: string) => {
  const currentEntry = ROUTE_CONFIG[routeKey] ?? {};

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

  const cvAsset = useMemo(() => {
    const defaultKey = DEFAULT_ROUTE_ENTRY.cv ?? DEFAULT_CV_KEY;
    const currentKey =
      currentEntry.cv ?? DEFAULT_ROUTE_ENTRY.cv ?? DEFAULT_CV_KEY;
    return CV_ASSETS[currentKey] ?? CV_ASSETS[defaultKey] ?? defaultCvPdf;
  }, [currentEntry]);

  const cvUrl = useMemo(
    () =>
      `${cvAsset}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width`,
    [cvAsset],
  );

  return {
    categories,
    categoriesWithMatrix,
    portfolioItems,
    workDetailMap,
    workImageMap: WORK_IMAGE_MAP,
    getYearRangeText,
    cvUrl,
    defaultCodes,
  };
};
