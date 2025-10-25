import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import './main.css';
import Layout from './components/Layout/Layout';
import Sidebar from './components/Sidebar/Sidebar';
import SidebarNav from './components/Sidebar/SidebarNav';
import HomeSection from './components/Home/HomeSection';
import CvViewer from './components/CvViewer/CvViewer';
import PortfolioContent from './components/Portfolio/PortfolioContent';
import { ContentKey, PortfolioCode } from './types/portfolio';
import { useRouteKey } from './hooks/useRouteKey';
import { usePortfolioData } from './hooks/usePortfolioData';
import { usePortfolioScrollSpy } from './hooks/usePortfolioScrollSpy';
import { useExperienceData } from './hooks/useExperienceData';

type FloatingBannerState = {
  code: PortfolioCode;
  title: string;
  left: number;
  width: number;
  top: number;
};

const Main: React.FC = () => {
  const [selectedContent, setSelectedContent] = useState<ContentKey>('home');
  const [activePortfolio, setActivePortfolio] =
    useState<PortfolioCode | null>(null);
  const [expandedWorks, setExpandedWorks] = useState<PortfolioCode[]>([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [floatingBannerState, setFloatingBannerState] =
    useState<FloatingBannerState | null>(null);
  const homeSectionRef = useRef<HTMLDivElement | null>(null);
  const cvSectionRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const portfolioSectionRef = useRef<HTMLDivElement | null>(null);
  const lastSectionRef = useRef<ContentKey>('home');

  const routeKey = useRouteKey();
  const {
    categories,
    categoriesWithMatrix,
    portfolioItems,
    workDetailMap,
    workImageMap,
    getYearRangeText,
    cvSettings,
  } = usePortfolioData(routeKey);
  const experienceGroups = useExperienceData(cvSettings.groups);

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

  const closeNavOnMobile = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches
    ) {
      setIsMobileNavOpen(false);
    }
  }, []);

  const scrollToElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element || typeof window === 'undefined') {
        return;
      }
      const offset = getScrollOffset();
      const rect = element.getBoundingClientRect();
      const position = rect.top + window.scrollY - offset - 16;
      window.scrollTo({ top: position, behavior: 'smooth' });
    },
    [getScrollOffset],
  );

  const scrollToPortfolioSection = useCallback(
    (code: PortfolioCode | undefined) => {
      if (!code) {
        return;
      }
      const section = document.getElementById(`portfolio-${code}`);
      scrollToElement(section);
    },
    [scrollToElement],
  );

  const scrollToPortfolioBottom = useCallback(
    (code: PortfolioCode) => {
      if (typeof window === 'undefined') {
        return;
      }
      const detailsEl = document.getElementById(
        `portfolio-${code}-details`,
      );
      if (!detailsEl) {
        return;
      }
      const offset = getScrollOffset();
      const rect = detailsEl.getBoundingClientRect();
      const bottom =
        rect.bottom + window.scrollY - window.innerHeight + offset + 24;
      window.scrollTo({
        top: Math.max(bottom, 0),
        behavior: 'smooth',
      });
    },
    [getScrollOffset],
  );

  const toggleCategoryCollapse = useCallback((categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName],
    );
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

  const handlePortfolioNavClick = useCallback(
    (code?: PortfolioCode) => {
      setSelectedContent('portfolio');
      closeNavOnMobile();
      if (code) {
        setActivePortfolio(code);
        const matchedCategory = categoriesWithMatrix.find((category) =>
          Boolean(category.itemsMap[code]),
        );
        const collapseOthers =
          typeof window !== 'undefined' &&
          !window.matchMedia('(max-width: 768px)').matches;
        updateExpandedCategories(matchedCategory?.name ?? null, collapseOthers);
      } else {
        setActivePortfolio(null);
      }

      requestAnimationFrame(() => {
        const targetCode = code ?? portfolioItems[0]?.code;
        if (code && targetCode) {
          scrollToPortfolioSection(targetCode);
          return;
        }

        const overviewElement = overviewRef.current || portfolioSectionRef.current;
        if (overviewElement && typeof window !== 'undefined') {
          const offset = getScrollOffset();
          const position =
            overviewElement.getBoundingClientRect().top +
            window.scrollY -
            offset -
            12;
          window.scrollTo({ top: position, behavior: 'smooth' });
        }
      });
    },
    [
      categoriesWithMatrix,
      closeNavOnMobile,
      getScrollOffset,
      portfolioItems,
      scrollToPortfolioSection,
      updateExpandedCategories,
    ],
  );

  const handleSelectContent = useCallback(
    (key: ContentKey) => {
      if (key === 'portfolio') {
        handlePortfolioNavClick();
        return;
      }
      setSelectedContent(key);
      closeNavOnMobile();
      setActivePortfolio(null);
      if (key === 'home') {
        scrollToElement(homeSectionRef.current);
      } else if (key === 'cv') {
        scrollToElement(cvSectionRef.current);
      }
    },
    [
      closeNavOnMobile,
      handlePortfolioNavClick,
      scrollToElement,
    ],
  );

  useEffect(() => {
    setExpandedCategories([]);
    setIsSidebarCollapsed(false);
  }, [routeKey, categoriesWithMatrix]);

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
    setExpandedWorks((prev) =>
      prev.filter((code) => portfolioItems.some((item) => item.code === code)),
    );
  }, [portfolioItems]);

  const scrollSummaryIntoView = useCallback(
    (code: PortfolioCode) => {
      if (typeof window === 'undefined') {
        return;
      }
      const summaryEl = document.getElementById(
        `portfolio-${code}-summary`,
      );
      if (!summaryEl) {
        return;
      }
      const offset = getScrollOffset();
      const rect = summaryEl.getBoundingClientRect();
      const top = rect.top + window.scrollY - offset - 16;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    },
    [getScrollOffset],
  );

  const toggleWork = useCallback(
    (code: PortfolioCode) => {
      setExpandedWorks((prev) => {
        const willCollapse = prev.includes(code);
        const next = willCollapse
          ? prev.filter((item) => item !== code)
          : [...prev, code];
        if (willCollapse) {
          requestAnimationFrame(() => {
            scrollSummaryIntoView(code);
          });
        }
        return next;
      });
    },
    [scrollSummaryIntoView],
  );


  usePortfolioScrollSpy({
    enabled: selectedContent === 'portfolio',
    portfolioItems,
    categoriesWithMatrix,
    getScrollOffset,
    onActiveChange: setActivePortfolio,
    updateExpandedCategories,
    isMobileNavOpen,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const activeCode = activePortfolio;
    if (!activeCode || !expandedWorks.includes(activeCode)) {
      setFloatingBannerState(null);
      return;
    }

    const activeItem = portfolioItems.find(
      (entry) => entry.code === activeCode,
    );
    if (!activeItem) {
      setFloatingBannerState(null);
      return;
    }

    const summaryEl = document.getElementById(
      `portfolio-${activeCode}-summary`,
    );
    const detailsEl = document.getElementById(
      `portfolio-${activeCode}-details`,
    );
    const bannerEl =
      detailsEl?.querySelector<HTMLDivElement>('.portfolio-detail-banner') ??
      null;

    if (!summaryEl || !detailsEl || !bannerEl) {
      setFloatingBannerState(null);
      return;
    }

    const title =
      activeItem.detail.fullName ||
      activeItem.detail.tableName ||
      activeItem.name;

    let rafId: number | null = null;

    const update = () => {
      const offset = getScrollOffset();
      const top = offset + 20;
      const summaryBottom =
        summaryEl.getBoundingClientRect().bottom + window.scrollY;
      const bannerRect = bannerEl.getBoundingClientRect();
      const detailsRect = detailsEl.getBoundingClientRect();
      const detailsBottom = detailsRect.bottom + window.scrollY;
      const floatingTop = window.scrollY + top;
      const rawStopThreshold = detailsBottom - bannerRect.height - 12;
      const minStopThreshold = summaryBottom + 8;
      const stopThreshold = Math.max(rawStopThreshold, minStopThreshold);
      const bottomLimit = detailsBottom - 12;

      const shouldFloat =
        window.scrollY + offset + 40 > summaryBottom &&
        floatingTop <= stopThreshold &&
        floatingTop < bottomLimit;

      if (!shouldFloat) {
        setFloatingBannerState((previous) => (previous ? null : previous));
        return;
      }

      const safeMargin = 16;
      let left = bannerRect.left;
      let width = bannerRect.width;

      if (left < safeMargin) {
        const delta = safeMargin - left;
        left = safeMargin;
        width = Math.max(width - delta, 280);
      }

      let overflowRight = left + width + safeMargin - window.innerWidth;
      if (overflowRight > 0) {
        const shift = Math.min(overflowRight, left - safeMargin);
        if (shift > 0) {
          left -= shift;
          overflowRight -= shift;
        }
        if (overflowRight > 0) {
          width = Math.max(width - overflowRight, 280);
        }
      }

      let availableWidth = window.innerWidth - left - safeMargin;
      if (availableWidth <= 0) {
        left = safeMargin;
        availableWidth = Math.max(window.innerWidth - safeMargin * 2, 0);
      }
      width = Math.min(width, availableWidth);

      const nextState: FloatingBannerState = {
        code: activeCode,
        title,
        left,
        width,
        top,
      };

      setFloatingBannerState((previous) => {
        if (
          previous &&
          previous.code === nextState.code &&
          previous.title === nextState.title &&
          Math.abs(previous.left - nextState.left) < 0.5 &&
          Math.abs(previous.width - nextState.width) < 0.5 &&
          Math.abs(previous.top - nextState.top) < 0.5
        ) {
          return previous;
        }
        return nextState;
      });
    };

    const handle = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', handle);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', handle);
      window.removeEventListener('resize', handle);
    };
  }, [activePortfolio, expandedWorks, getScrollOffset, portfolioItems]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const sections: Array<{ key: ContentKey; ref: React.RefObject<HTMLDivElement | null> }> = [
      { key: 'home', ref: homeSectionRef },
      { key: 'cv', ref: cvSectionRef },
      { key: 'portfolio', ref: portfolioSectionRef },
    ];

    const handleScroll = () => {
      const offset = getScrollOffset();
      const referenceY = window.scrollY + offset + window.innerHeight * 0.25;
      let currentKey: ContentKey = 'home';

      sections.forEach(({ key, ref }) => {
        const element = ref.current;
        if (!element) {
          return;
        }
        const top = element.getBoundingClientRect().top + window.scrollY;
        if (referenceY >= top) {
          currentKey = key;
        }
      });

      if (currentKey !== lastSectionRef.current) {
        lastSectionRef.current = currentKey;
        setSelectedContent(currentKey);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [getScrollOffset]);

  const navProps = useMemo(
    () => ({
      selectedContent,
      onSelectContent: handleSelectContent,
      categories,
      activePortfolio,
      expandedCategories,
      onToggleCategory: toggleCategoryCollapse,
      onNavigatePortfolio: handlePortfolioNavClick,
    }),
    [
      activePortfolio,
      categories,
      expandedCategories,
      handlePortfolioNavClick,
      handleSelectContent,
      selectedContent,
      toggleCategoryCollapse,
    ],
  );

  const floatingBannerPortal =
    floatingBannerState && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="portfolio-detail-banner portfolio-detail-banner-floating"
            style={{
              top: `${floatingBannerState.top}px`,
              left: `${floatingBannerState.left}px`,
              width: `${floatingBannerState.width}px`,
            }}
          >
            <div className="portfolio-detail-banner-info">
              <strong>{floatingBannerState.title}</strong>
            </div>
            <div className="portfolio-detail-banner-actions">
              <button
                type="button"
                onClick={() =>
                  scrollToPortfolioBottom(floatingBannerState.code)
                }
              >
                到底部
              </button>
              <button
                type="button"
                onClick={() =>
                  scrollToPortfolioSection(floatingBannerState.code)
                }
              >
                回到頂部
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={() => toggleWork(floatingBannerState.code)}
              >
                收合
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <Layout
      sidebar={
        <Sidebar
          title="PEI-EN"
          isCollapsed={isSidebarCollapsed}
          onCollapseToggle={() =>
            setIsSidebarCollapsed((previous) => !previous)
          }
        >
          <SidebarNav {...navProps} />
        </Sidebar>
      }
      mobileNavMenu={<SidebarNav {...navProps} />}
      isSidebarCollapsed={isSidebarCollapsed}
      onSidebarExpand={() => setIsSidebarCollapsed(false)}
      isMobileNavOpen={isMobileNavOpen}
      onMobileNavToggle={() =>
        setIsMobileNavOpen((previous) => !previous)
      }
      mobileTitle="PEI EN LI"
    >
      {floatingBannerPortal}
      <div className="page-sections">
        <section
          className="page-section"
          id="section-home"
          ref={homeSectionRef}
        >
          <HomeSection />
        </section>
        <section
          className="page-section"
          id="section-cv"
          ref={cvSectionRef}
        >
          <CvViewer
            settings={cvSettings}
            experienceGroups={experienceGroups}
            workDetailMap={workDetailMap}
            onNavigateToWork={(code) => handlePortfolioNavClick(code)}
          />
        </section>
        <section
          className="page-section"
          id="section-portfolio"
          ref={portfolioSectionRef}
        >
          <PortfolioContent
            categories={categoriesWithMatrix}
            activePortfolio={activePortfolio}
            expandedWorks={expandedWorks}
            onToggleWork={toggleWork}
            onNavigate={handlePortfolioNavClick}
            getYearRangeText={getYearRangeText}
            workImageMap={workImageMap}
            overviewRef={overviewRef}
            floatingWorkCode={floatingBannerState?.code ?? null}
          />
        </section>
      </div>
    </Layout>
  );
};

export default Main;
