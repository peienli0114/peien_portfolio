import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

const Main: React.FC = () => {
  const [selectedContent, setSelectedContent] = useState<ContentKey>('home');
  const [activePortfolio, setActivePortfolio] =
    useState<PortfolioCode | null>(null);
  const [expandedWorks, setExpandedWorks] = useState<PortfolioCode[]>([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
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
          const section = document.getElementById(`portfolio-${targetCode}`);
          if (section && typeof window !== 'undefined') {
            const offset = getScrollOffset();
            const position =
              section.getBoundingClientRect().top +
              window.scrollY -
              offset -
              8;
            window.scrollTo({ top: position, behavior: 'smooth' });
          }
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
    [closeNavOnMobile, handlePortfolioNavClick, scrollToElement],
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

  const toggleWork = useCallback((code: PortfolioCode) => {
    setExpandedWorks((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    );
  }, []);


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
          />
        </section>
      </div>
    </Layout>
  );
};

export default Main;
