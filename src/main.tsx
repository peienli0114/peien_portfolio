import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
type WorkImages = {
  main: string | null;
  gallery: string[];
};

const WORK_IMAGE_MAP: Record<string, WorkImages> = (() => {
  const map: Record<string, WorkImages> = {};
  const context = require.context('./asset/work', true, /\.(png|jpe?g|gif|svg)$/);
  context.keys().forEach((key) => {
    const src = context(key) as string;
    const normalized = key.replace('./', '');
    const [folder, file] = normalized.split('/');
    if (!folder || !file) {
      return;
    }
    const code = folder.toLowerCase();
    if (!map[code]) {
      map[code] = { main: null, gallery: [] };
    }
    const lowerFile = file.toLowerCase();
    if (lowerFile === 'mainpic.png' || lowerFile.startsWith('main.')) {
      map[code].main = src;
    } else {
      map[code].gallery.push(src);
    }
  });
  return map;
})();

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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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
    setExpandedCategory((current) =>
      current === categoryName ? null : categoryName,
    );
  };

  const defaultCodes = useMemo(
    () => Object.keys(portfolioMap).sort((a, b) => a.localeCompare(b)),
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
    setExpandedCategory(null);
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
      if (stillExists && current) {
        return current;
      }
      return portfolioItems[0].code;
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
      const positions = sections
        .map(({ code, element }) => ({
          code,
          top: element.getBoundingClientRect().top - offset,
        }))
        .sort((a, b) => a.top - b.top);

      const target =
        positions.find((entry) => entry.top >= -32) ??
        positions[positions.length - 1];

      if (target) {
        const sectionCategory = categoriesWithMatrix.find((category) =>
          Boolean(category.itemsMap[target.code]),
        );
        setExpandedCategory(sectionCategory?.name ?? null);
        setActivePortfolio((current) =>
          current === target.code ? current : target.code,
        );
      }
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
  ]);

  useEffect(() => {
    setExpandedWorks((prev) =>
      prev.filter((code) =>
        portfolioItems.some((item) => item.code === code),
      ),
    );
  }, [portfolioItems]);

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
    }

    requestAnimationFrame(() => {
      const targetCode = code ?? portfolioItems[0]?.code;
      if (!targetCode) {
        return;
      }

      const section = document.getElementById(`portfolio-${targetCode}`);
      if (section && typeof window !== 'undefined') {
        const offset = getScrollOffset();
        const position =
          section.getBoundingClientRect().top + window.scrollY - offset - 8;
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
          {categories.map((category) => {
            const isOpen = expandedCategory === category.name;
            const containsActive = category.items.some(
              (item) => item.code === activePortfolio,
            );
            return (
              <div className="sidebar-category-group" key={category.name}>
                <button
                  type="button"
                  className={`sidebar-category-title${
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
                      <li key={item.code}>
                        <button
                          type="button"
                          onClick={() => handlePortfolioNavClick(item.code)}
                          className={`sidebar-button${
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

      return (
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
                const yearRange = [detail.yearBegin, detail.yearEnd]
                  .filter(Boolean)
                  .join(' – ');
                const fullDisplayName =
                  detail.fullName || detail.tableName || item.name;
                const tags = detail.tags ?? [];
                const galleryImages = previewUrl
                  ? imageResources.gallery.filter((src) => src !== previewUrl)
                  : imageResources.gallery;

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
                    {isExpanded && (
                      <div className="portfolio-details">
                        <div className="portfolio-detail-banner">
                          <span>{fullDisplayName}</span>
                          <div className="portfolio-detail-actions">
                            <button
                              type="button"
                              className="portfolio-detail-close"
                              onClick={() => {
                                const section = document.getElementById(`portfolio-${item.code}`);
                                section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                            >
                              回到頂部
                            </button>
                            <button
                              type="button"
                              className="portfolio-detail-close"
                              onClick={() => toggleWork(item.code)}
                            >
                              關閉 ×
                            </button>
                          </div>
                        </div>
                        {yearRange && (
                          <p className="portfolio-meta">{yearRange}</p>
                        )}
                        {detail.introList && detail.introList.length > 0 && (
                          <ul className="portfolio-detail-list">
                            {detail.introList.map((entry, index) => (
                              <li key={index}>{entry}</li>
                            ))}
                          </ul>
                        )}
                        {galleryImages.length > 0 && (
                          <div className="portfolio-gallery">
                            {galleryImages.map((src, index) => (
                              <img
                                key={index}
                                src={src}
                                alt={`${fullDisplayName} 作品圖 ${index + 1}`}
                              />
                            ))}
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
