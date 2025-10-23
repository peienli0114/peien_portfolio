import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './main.css';
import portfolioMap from './work_list/portfolioMap.json';
import portfolioRoutes from './work_list/portfolioRoutes.json';
import workDetails from './work_list/allWorkData.json';
import defaultCvPdf from './asset/cv/cv-ch1018.pdf';

type ContentKey = 'home' | 'cv' | 'portfolio';
type PortfolioCode = string;
type PortfolioItem = {
  code: PortfolioCode;
  name: string;
  category: string;
  detail: WorkDetail;
};
type PortfolioCategory = {
  name: string;
  items: PortfolioItem[];
};
type PortfolioCategoryWithMatrix = PortfolioCategory & {
  itemsMap: Record<string, PortfolioItem>;
};
type PortfolioRouteEntry = {
  cv?: string;
  categories?: Record<string, PortfolioCode[]>;
};
type PortfolioRouteConfig = Record<string, PortfolioRouteEntry>;

type WorkDetail = {
  fullName?: string;
  h2Name?: string;
  tableName?: string;
  yearBegin?: string;
  yearEnd?: string;
  intro?: string;
  introList?: string[];
  headPic?: string;
  tags?: string[];
  links?: Array<{ name?: string; link?: string }>;
  coWorkers?: Array<{ name?: string; work?: string; link?: string }>;
  content?: string;
};

const getPortfolioName = (code: string): string | undefined =>
  portfolioMap[code as keyof typeof portfolioMap];

const ROUTE_CONFIG = portfolioRoutes as PortfolioRouteConfig;
const DEFAULT_CV_KEY = 'cv-ch1018.pdf';
const CV_ASSETS: Record<string, string> = {
  [DEFAULT_CV_KEY]: defaultCvPdf,
};
const DEFAULT_ROUTE_ENTRY: PortfolioRouteEntry = ROUTE_CONFIG.default ?? {};
const workDetailMap = workDetails as Record<string, WorkDetail>;
type WorkGalleryItem = {
  type: 'image' | 'pdf';
  src: string;
};

type WorkImages = {
  main: string | null;
  gallery: WorkGalleryItem[];
  videos: string[];
};

const WORK_IMAGE_MAP: Record<string, WorkImages> = (() => {
  const map: Record<string, WorkImages> = {};
  const context = require.context('./asset/work', true, /\.(png|jpe?g|gif|svg|pdf)$/);
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
      const type: WorkGalleryItem['type'] = lowerFile.endsWith('.pdf') ? 'pdf' : 'image';
      map[code].gallery.push({ type, src });
    }
  });
  return map;
})();

const embedYouTube = (url: string): string => {
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (!youtubeMatch) {
    return url;
  }
  return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
};

const parseArray = (value?: string | string[]): string[] => {
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

const resolvePreviewUrl = (path?: string): string | null => {
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

const Main: React.FC = () => {
  const [selectedContent, setSelectedContent] = useState<ContentKey>('home');
  const [activePortfolio, setActivePortfolio] = useState<PortfolioCode | null>(
    null,
  );
  const [expandedWorks, setExpandedWorks] = useState<PortfolioCode[]>([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const overviewRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const overviewRowListeners = useRef<Record<string, () => void>>({});
  const [overviewScrollState, setOverviewScrollState] = useState<
    Record<string, { left: boolean; right: boolean }>
  >({});

  const routeKey = useMemo(() => {
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

  const readMobileNavHeight = useCallback(() => {
    if (typeof document === 'undefined') {
      return 0;
    }
    const nav = document.querySelector<HTMLElement>('.mobile-nav');
    return nav ? nav.offsetHeight : 0;
  }, []);

  const updateMobileNavHeightVar = useCallback(() => {
    if (typeof document === 'undefined') {
      return 0;
    }
    const prefersMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches;
    const height = prefersMobile ? readMobileNavHeight() : 0;
    document.documentElement.style.setProperty(
      '--mobile-nav-height',
      `${height}px`,
    );
    return height;
  }, [readMobileNavHeight]);

  const getScrollOffset = useCallback(() => {
    if (typeof window === 'undefined') {
      return 0;
    }
    if (!window.matchMedia('(max-width: 768px)').matches) {
      return 0;
    }
    const stored = document.documentElement.style.getPropertyValue(
      '--mobile-nav-height',
    );
    const parsed = parseInt(stored, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    return updateMobileNavHeightVar();
  }, [updateMobileNavHeightVar]);

  const closeNavOnMobile = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches
    ) {
      setIsMobileNavOpen(false);
    }
  };

  const handleSelectContent = (key: ContentKey) => {
    setSelectedContent(key);
    closeNavOnMobile();
    if (key !== 'portfolio') {
      setActivePortfolio(null);
    }
  };

  const toggleCategoryCollapse = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName],
    );
  };

  const updateOverviewScrollState = useCallback((name: string) => {
    const node = overviewRowRefs.current[name];
    if (!node) {
      setOverviewScrollState((prev) => {
        if (!(name in prev)) {
          return prev;
        }
        const { [name]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = node;
    const left = scrollLeft > 8;
    const right = scrollLeft + clientWidth < scrollWidth - 8;
    setOverviewScrollState((prev) => {
      const previous = prev[name];
      if (previous && previous.left === left && previous.right === right) {
        return prev;
      }
      return { ...prev, [name]: { left, right } };
    });
  }, []);

  const registerOverviewRow = useCallback(
    (name: string) => (node: HTMLDivElement | null) => {
      const prevNode = overviewRowRefs.current[name];
      const prevHandler = overviewRowListeners.current[name];
      if (prevNode === node) {
        return;
      }
      if (prevNode && prevHandler) {
        prevNode.removeEventListener('scroll', prevHandler);
      }

      if (!node) {
        delete overviewRowRefs.current[name];
        delete overviewRowListeners.current[name];
        setOverviewScrollState((prev) => {
          if (!(name in prev)) {
            return prev;
          }
          const { [name]: _removed, ...rest } = prev;
          return rest;
        });
        return;
      }

      overviewRowRefs.current[name] = node;
      const handler = () => updateOverviewScrollState(name);
      overviewRowListeners.current[name] = handler;
      node.addEventListener('scroll', handler);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => handler());
      } else {
        handler();
      }
    },
    [updateOverviewScrollState],
  );

  const handleOverviewScroll = useCallback((name: string, direction: 'left' | 'right') => {
    const node = overviewRowRefs.current[name];
    if (!node) {
      return;
    }
    const delta = node.clientWidth * 0.75;
    node.scrollBy({
      left: direction === 'left' ? -delta : delta,
      behavior: 'smooth',
    });
  }, []);

  const defaultCodes = useMemo(
    () => Object.keys(portfolioMap).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const getYearRangeText = useCallback((detail: WorkDetail): string => {
    const start = (detail.yearBegin || '').trim();
    const end = (detail.yearEnd || '').trim();
    if (start && end && start !== end) {
      return `${start} – ${end}`;
    }
    return start || end || '';
  }, []);

  const updateExpandedCategories = useCallback(
    (categoryName: string | null, collapseOthers = false) => {
      if (!categoryName) {
        return;
      }
      setExpandedCategories((prev) => {
        const already = prev.includes(categoryName);
        if (collapseOthers) {
          return already && prev.length === 1 && prev[0] === categoryName
            ? prev
            : [categoryName];
        }
        if (already) {
          return prev;
        }
        return [...prev, categoryName];
      });
    },
    [],
  );

  const categories = useMemo<PortfolioCategory[]>(() => {
    const normalized = new Map(
      defaultCodes.map((code) => [code.toLowerCase(), code]),
    );

    const buildCategories = (
      source?: Record<string, PortfolioCode[]>,
    ): PortfolioCategory[] => {
      if (!source) {
        return [];
      }

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
          const detail = workDetailMap[resolved] ?? {
            tableName: name,
            fullName: name,
            intro: '',
            introList: [],
            headPic: '',
            tags: [],
          };
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

    const currentEntry = ROUTE_CONFIG[routeKey] ?? {};
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
        ? [{ name: '作品集', items: fallbackItems.map((item) => ({
              ...item,
              detail: workDetailMap[item.code] ?? {
                tableName: item.name,
                fullName: item.name,
                intro: '',
                introList: [],
                headPic: '',
                tags: [],
              },
            })) }]
        : [];
    }

    return resolvedCategories;
  }, [defaultCodes, routeKey]);

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

  useEffect(() => {
    setExpandedCategories([]);
    setIsSidebarCollapsed(false);
  }, [routeKey, categoriesWithMatrix]);

  const cvAsset = useMemo(() => {
    const defaultKey = DEFAULT_ROUTE_ENTRY.cv ?? DEFAULT_CV_KEY;
    const currentKey =
      ROUTE_CONFIG[routeKey]?.cv ?? DEFAULT_ROUTE_ENTRY.cv ?? DEFAULT_CV_KEY;
    return CV_ASSETS[currentKey] ?? CV_ASSETS[defaultKey] ?? defaultCvPdf;
  }, [routeKey]);

  const cvUrl = useMemo(
    () =>
      `${cvAsset}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width`,
    [cvAsset],
  );

  useEffect(() => {
    updateMobileNavHeightVar();
    if (typeof window === 'undefined') {
      return;
    }
    const handleResize = () => {
      updateMobileNavHeightVar();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateMobileNavHeightVar]);

  useEffect(() => {
    updateMobileNavHeightVar();
  }, [isMobileNavOpen, updateMobileNavHeightVar]);

  useEffect(() => {
    if (selectedContent !== 'portfolio') {
      setActivePortfolio(null);
      return;
    }

    setActivePortfolio((current) => {
      if (portfolioItems.length === 0) {
        return null;
      }
      const stillExists = current
        ? portfolioItems.some((item) => item.code === current)
        : false;
      return stillExists ? current : null;
    });
  }, [portfolioItems, selectedContent]);

  useEffect(() => {
    if (selectedContent !== 'portfolio') {
      return;
    }

    const sections = portfolioItems
      .map((item) => {
        const element = document.getElementById(`portfolio-${item.code}`);
        if (!element) {
          return null;
        }
        return { code: item.code, element };
      })
      .filter(
        (value): value is { code: PortfolioCode; element: HTMLElement } =>
          Boolean(value),
      );

    if (!sections.length) {
      return;
    }

    const updateActive = () => {
      const offset = getScrollOffset();
      const viewportHeight = window.innerHeight;
      const focusTop = viewportHeight * 0.35;
      const focusBottom = viewportHeight * 0.75;

      let candidate: PortfolioCode | null = null;

      sections.forEach(({ code, element }, index) => {
        const rect = element.getBoundingClientRect();
        const adjustedTop = rect.top - offset;
        const adjustedBottom = rect.bottom - offset;

        const isWithinFocus =
          adjustedTop <= focusBottom && adjustedBottom >= focusTop;

        if (isWithinFocus) {
          if (candidate === null) {
            candidate = code;
          }
          const nextSection = sections[index + 1];
          if (
            nextSection &&
            nextSection.element.getBoundingClientRect().top - offset < focusBottom
          ) {
            candidate = nextSection.code;
          }
        }
      });

      if (candidate === null && sections.length) {
        const { code, element } = sections[sections.length - 1];
        const rect = element.getBoundingClientRect();
        if (rect.top - offset < focusBottom) {
          candidate = code;
        }
      }

      if (candidate) {
        const sectionCategory = categoriesWithMatrix.find((category) =>
          Boolean(category.itemsMap[candidate!]),
        );
        const collapseOthers = !window.matchMedia('(max-width: 768px)').matches;
        updateExpandedCategories(sectionCategory?.name ?? null, collapseOthers);
      }

      setActivePortfolio((current) =>
        current === candidate ? current : candidate ?? null,
      );
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          updateActive();
          ticking = false;
        });
      }
    };

    const handleResize = () => {
      updateMobileNavHeightVar();
      updateActive();
    };

    updateActive();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    categoriesWithMatrix,
    getScrollOffset,
    isMobileNavOpen,
    portfolioItems,
    selectedContent,
    updateMobileNavHeightVar,
    updateExpandedCategories,
  ]);

  useEffect(() => {
    setExpandedWorks((prev) =>
      prev.filter((code) =>
        portfolioItems.some((item) => item.code === code),
      ),
    );
  }, [portfolioItems]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleResize = () => {
      Object.keys(overviewRowRefs.current).forEach((name) => {
        updateOverviewScrollState(name);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateOverviewScrollState]);

  useEffect(() => {
    Object.keys(overviewRowRefs.current).forEach((name) => {
      updateOverviewScrollState(name);
    });
  }, [categoriesWithMatrix, selectedContent, updateOverviewScrollState]);

  const toggleWork = (code: PortfolioCode) => {
    setExpandedWorks((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    );
  };

  const handlePortfolioNavClick = (code?: PortfolioCode) => {
    setSelectedContent('portfolio');
    closeNavOnMobile();
    if (code) {
      setActivePortfolio(code);
      const matchedCategory = categoriesWithMatrix.find((category) =>
        Boolean(category.itemsMap[code]),
      );
      const collapseOthers = !window.matchMedia('(max-width: 768px)').matches;
      updateExpandedCategories(matchedCategory?.name ?? null, collapseOthers);
    } else {
      setActivePortfolio(null);
    }

    requestAnimationFrame(() => {
      const targetCode = code ?? portfolioItems[0]?.code;
      if (code) {
        const section = document.getElementById(`portfolio-${targetCode}`);
        if (section && typeof window !== 'undefined') {
          const offset = getScrollOffset();
          const position =
            section.getBoundingClientRect().top + window.scrollY - offset - 8;
          window.scrollTo({ top: position, behavior: 'smooth' });
        }
        return;
      }

      if (overviewRef.current && typeof window !== 'undefined') {
        const offset = getScrollOffset();
        const position =
          overviewRef.current.getBoundingClientRect().top +
          window.scrollY -
          offset -
          12;
        window.scrollTo({ top: position, behavior: 'smooth' });
      }
    });
  };

  const renderNavItems = () => (
    <ul>
      <li className="sidebar-section">
        <button
          type="button"
          onClick={() => handleSelectContent('home')}
          className={`sidebar-button${
            selectedContent === 'home' ? ' is-active' : ''
          }`}
        >
          home
        </button>
      </li>
      <li className="sidebar-section">
        <button
          type="button"
          onClick={() => handleSelectContent('cv')}
          className={`sidebar-button${
            selectedContent === 'cv' ? ' is-active' : ''
          }`}
        >
          cv
        </button>
      </li>
      <li className="sidebar-section sidebar-portfolio">
        <button
          type="button"
          onClick={() => handlePortfolioNavClick()}
          className={`sidebar-button${
            selectedContent === 'portfolio' ? ' is-active' : ''
          }`}
        >
          作品集
        </button>
        <div className="sidebar-category-collection">
          <div className="sidebar-subitem">
            <button
              type="button"
              onClick={() => handlePortfolioNavClick()}
              className={`sidebar-button sidebar-button--sub${
                selectedContent === 'portfolio' && !activePortfolio
                  ? ' is-active'
                  : ''
              }`}
            >
              作品集目錄
            </button>
          </div>
          {categories.map((category) => {
            const isOpen = expandedCategories.includes(category.name);
            const containsActive = category.items.some(
              (item) => item.code === activePortfolio,
            );
            return (
              <div
                className="sidebar-category-group sidebar-subitem"
                key={category.name}
              >
                <button
                  type="button"
                  className={`sidebar-category-title sidebar-category-title--sub${
                    isOpen ? ' is-open' : ''
                  }${containsActive ? ' is-active' : ''}`}
                  onClick={() => toggleCategoryCollapse(category.name)}
                  aria-expanded={isOpen}
                >
                  {category.name}
                  <span className="sidebar-caret" aria-hidden>{
                    isOpen ? '▾' : '▸'
                  }</span>
                </button>
                {isOpen && (
                  <ul>
                    {category.items.map((item) => (
                      <li key={item.code} className="sidebar-leaf">
                        <button
                          type="button"
                          onClick={() => handlePortfolioNavClick(item.code)}
                          className={`sidebar-button sidebar-button--leaf${
                            selectedContent === 'portfolio' &&
                            activePortfolio === item.code
                              ? ' is-active'
                              : ''
                          }`}
                        >
                          {item.detail.tableName || item.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </li>
    </ul>
  );

  const renderContent = () => {
    if (selectedContent === 'cv') {
      return (
        <div className="pdf-container">
          <iframe
            src={cvUrl}
            title="CV PDF"
            className="content-pdf"
            aria-label="CV PDF"
          />
        </div>
      );
    }

    if (selectedContent === 'portfolio') {
      if (portfolioItems.length === 0) {
        return (
          <div className="content-wrapper">
            <h2>作品集</h2>
            <p>目前這個路徑尚未配置要顯示的作品。</p>
          </div>
        );
      }

      const overview = (
        <div
          ref={overviewRef}
          className="portfolio-overview"
          aria-labelledby="portfolio-overview-heading"
        >
          <div className="portfolio-overview-header">
            <h2 id="portfolio-overview-heading">作品集目錄</h2>
            <p>依分類快速預覽作品，點擊卡片即可跳轉至下方詳細介紹。</p>
          </div>
          {categoriesWithMatrix.map((category) => {
            if (!category.items.length) {
              return null;
            }
            return (
              <div className="portfolio-overview-category" key={`overview-${category.name}`}>
                <h3 className="portfolio-overview-title">{category.name}</h3>
                <div className="portfolio-overview-row">
                  <button
                    type="button"
                    className="portfolio-overview-scroll is-left"
                    onClick={() => handleOverviewScroll(category.name, 'left')}
                    disabled={!overviewScrollState[category.name]?.left}
                    aria-label={`${category.name} 往左捲動`}
                  >
                    ‹
                  </button>
                  <div
                    className="portfolio-overview-items"
                    ref={registerOverviewRow(category.name)}
                  >
                    {category.items.map((item) => {
                      const detail = item.detail;
                      const preview = detail.headPic
                        ? resolvePreviewUrl(detail.headPic)
                        : WORK_IMAGE_MAP[item.code.toLowerCase()]?.main || null;
                      const yearText = getYearRangeText(detail);
                      const displayName =
                        detail.tableName || detail.fullName || item.name;
                      return (
                        <button
                          type="button"
                          key={`overview-card-${item.code}`}
                          className={`portfolio-overview-card${
                            activePortfolio === item.code ? ' is-active' : ''
                          }`}
                          onClick={() => handlePortfolioNavClick(item.code)}
                        >
                          <div className="portfolio-overview-thumb">
                            {preview ? (
                              <img
                                src={preview}
                                alt={`${detail.tableName || item.name} 預覽`}
                              />
                            ) : (
                              <span className="portfolio-overview-placeholder">
                                尚未提供主圖
                              </span>
                            )}
                          </div>
                          <div className="portfolio-overview-info">
                            <span className="portfolio-overview-name">
                              {displayName}
                            </span>
                            {detail.h2Name && (
                              <span className="portfolio-overview-subtitle">
                                {detail.h2Name}
                              </span>
                            )}
                            {yearText && (
                              <span className="portfolio-overview-year">
                                {yearText}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="portfolio-overview-scroll is-right"
                    onClick={() => handleOverviewScroll(category.name, 'right')}
                    disabled={!overviewScrollState[category.name]?.right}
                    aria-label={`${category.name} 往右捲動`}
                  >
                    ›
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );

      return (
        <>
          {overview}
          <div className="portfolio-container">
            {categoriesWithMatrix.map((category) => (
              <React.Fragment key={category.name}>
                {category.items.length > 0 && (
                  <div className="portfolio-category-divider" data-category={category.name}>
                    <span>{category.name}</span>
                </div>
              )}
              {category.items.map((item) => {
                const isExpanded = expandedWorks.includes(item.code);
                const detail = item.detail;
                const imageResources = WORK_IMAGE_MAP[item.code.toLowerCase()] || {
                  main: null,
                  gallery: [],
                  videos: [],
                };
                const previewUrl = detail.headPic
                  ? resolvePreviewUrl(detail.headPic)
                  : imageResources.main;
                const introText =
                  detail.intro?.trim() || '這個作品的介紹尚未補充，歡迎之後回來看看。';
                const introParagraphs = introText
                  .split(/\n\s*\n/)
                  .map((segment) => segment.replace(/\s+/g, ' ').trim())
                  .filter(Boolean);
                const yearRange = getYearRangeText(detail);
                const fullDisplayName =
                  detail.fullName || detail.tableName || item.name;
                const tags = detail.tags ?? [];
                const galleryItems = imageResources.gallery.filter((galleryItem) =>
                  previewUrl ? galleryItem.src !== previewUrl : true,
                );
                const videoUrls = parseArray(detail.content).filter((link) =>
                  /youtube\.com|youtu\.be/.test(link),
                );
                const links = detail.links ?? [];
                const coWorkers = detail.coWorkers ?? [];

                return (
                  <section
                    key={item.code}
                    id={`portfolio-${item.code}`}
                    data-code={item.code}
                    className={`portfolio-section${
                      activePortfolio === item.code ? ' is-active' : ''
                    }`}
                  >
                    <div className="portfolio-summary-block">
                      <div className="portfolio-preview">
                        {previewUrl ? (
                          <img src={previewUrl} alt={`${fullDisplayName} 主視覺`} />
                        ) : (
                          <span className="portfolio-preview-placeholder">主要視覺尚未提供</span>
                        )}
                      </div>
                      <div className="portfolio-summary-text">
                        <div className="portfolio-heading portfolio-heading-inline">
                          <h2>{fullDisplayName}</h2>
                        </div>
                        {detail.h2Name && (
                          <p className="portfolio-subtitle">{detail.h2Name}</p>
                        )}
                        {tags.length > 0 && (
                          <div className="portfolio-tags">
                            {tags.map((tag, index) => (
                              <span className="portfolio-tag" key={index}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {introParagraphs.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                        <div className="portfolio-summary-footer">
                          {yearRange ? (
                            <span className="portfolio-year">{yearRange}</span>
                          ) : (
                            <span className="portfolio-year" />
                          )}
                          {!isExpanded && (
                            <button
                              type="button"
                              className="portfolio-toggle preview-toggle"
                              onClick={() => toggleWork(item.code)}
                            >
                              閱讀更多
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="portfolio-details">
                        <div className="portfolio-detail-banner">
                          <span>
                            {fullDisplayName}
                            {detail.h2Name ? ` | ${detail.h2Name}` : ''}
                          </span>
                          <div className="portfolio-detail-actions">
                            <button
                              type="button"
                              className="portfolio-detail-close"
                              onClick={() => {
                                const section = document.getElementById(`portfolio-${item.code}`);
                                section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="portfolio-detail-close"
                              onClick={() => toggleWork(item.code)}
                            >
                              Ｘ
                            </button>
                          </div>
                        </div>
                        {detail.introList && detail.introList.length > 0 && (
                          <ul className="portfolio-detail-list">
                            {detail.introList.map((entry, index) => (
                              <li key={index}>{entry}</li>
                            ))}
                          </ul>
                        )}
                        {(galleryItems.length > 0 || videoUrls.length > 0) && (
                          <div className="portfolio-gallery">
                            {galleryItems.map((galleryItem, index) =>
                              galleryItem.type === 'pdf' ? (
                                <object
                                  key={`pdf-${index}`}
                                  data={galleryItem.src}
                                  type="application/pdf"
                                  className="portfolio-preview-pdf"
                                  aria-label={`${fullDisplayName} PDF ${index + 1}`}
                                >
                                  <a href={galleryItem.src} target="_blank" rel="noopener noreferrer">
                                    下載 {fullDisplayName} PDF
                                  </a>
                                </object>
                              ) : (
                                <img
                                  key={`img-${index}`}
                                  src={galleryItem.src}
                                  alt={`${fullDisplayName} 作品圖 ${index + 1}`}
                                />
                              ),
                            )}
                            {videoUrls.map((link, index) => (
                              <div className="portfolio-video" key={`video-${index}`}>
                                <iframe
                                  src={embedYouTube(link)}
                                  title={`${fullDisplayName} 影片 ${index + 1}`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {coWorkers.length > 0 && (
                          <div className="portfolio-meta-block">
                            <h4 className="portfolio-meta-title">專案成員</h4>
                            <ul className="portfolio-meta-list">
                              {coWorkers.map((person, index) => (
                                <li key={`co-${index}`}>
                                  <span>{person.name || '未提供姓名'}</span>
                                  {person.work && (
                                    <span className="portfolio-meta-note">{person.work}</span>
                                  )}
                                  {person.link && (
                                    <a
                                      href={person.link}
                                      className="portfolio-meta-link"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      連結
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {links.length > 0 && (
                          <div className="portfolio-meta-block">
                            <h4 className="portfolio-meta-title">相關連結</h4>
                            <ul className="portfolio-meta-list">
                              {links.map((item, index) => (
                                <li key={`link-${index}`}>
                                  {item.link ? (
                                    <a
                                      href={item.link}
                                      className="portfolio-meta-link"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item.name || item.link}
                                    </a>
                                  ) : (
                                    item.name || item.link
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
              </React.Fragment>
            ))}
          </div>
        </>
      );
    }

    if (selectedContent === 'home') {
      return (
        <div className="content-wrapper">
          <h2>歡迎</h2>
          <p>請從左側選單選擇想查看的內容。</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`layout${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {isSidebarCollapsed && (
        <button
          type="button"
          className="sidebar-collapse-toggle desktop-only"
          onClick={() => setIsSidebarCollapsed(false)}
          aria-expanded={!isSidebarCollapsed}
        >
          展開
目錄
        </button>
      )}
      <header className={`mobile-nav${isMobileNavOpen ? ' is-open' : ''}`}>
        <div className="mobile-nav-inner">
          <div className="mobile-nav-bar">
            <h1 className="sidebar-title">PEI EN LI</h1>
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setIsMobileNavOpen((open) => !open)}
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-nav"
            >
              {isMobileNavOpen ? '關閉目錄' : '展開目錄'}
            </button>
          </div>
          <nav id="mobile-nav" className="nav-menu">
            {renderNavItems()}
          </nav>
        </div>
      </header>
      <aside className="panel panel-left" data-mobile-nav>
        <div className="sidebar">
          <div className="sidebar-header desktop-only">
            <h1 className="sidebar-title">PEI-EN</h1>
            <button
              type="button"
              className="sidebar-collapse-control"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-expanded={!isSidebarCollapsed}
            >
              {isSidebarCollapsed ? '展開目錄' : '收合目錄'}
            </button>
          </div>
          <nav className="nav-menu">{renderNavItems()}</nav>
        </div>
      </aside>
      <section className="panel panel-right">
        {renderContent()}
      </section>
    </div>
  );
};

export default Main;
