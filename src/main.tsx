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

const Main: React.FC = () => {
  const [selectedContent, setSelectedContent] = useState<ContentKey>('home');
  const [activePortfolio, setActivePortfolio] =
    useState<PortfolioCode | null>(null);
  const [expandedWorks, setExpandedWorks] = useState<PortfolioCode[]>([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const overviewRef = useRef<HTMLDivElement | null>(null);

  const routeKey = useRouteKey();
  const {
    categories,
    categoriesWithMatrix,
    portfolioItems,
    workImageMap,
    getYearRangeText,
    cvUrl,
  } = usePortfolioData(routeKey);

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

  const handleSelectContent = useCallback(
    (key: ContentKey) => {
      setSelectedContent(key);
      closeNavOnMobile();
      if (key !== 'portfolio') {
        setActivePortfolio(null);
      }
    },
    [closeNavOnMobile],
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
    },
    [
      categoriesWithMatrix,
      closeNavOnMobile,
      getScrollOffset,
      portfolioItems,
      updateExpandedCategories,
    ],
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

  const content = useMemo(() => {
    if (selectedContent === 'cv') {
      return <CvViewer src={cvUrl} />;
    }

    if (selectedContent === 'portfolio') {
      return (
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
      );
    }

    return <HomeSection />;
  }, [
    activePortfolio,
    categoriesWithMatrix,
    cvUrl,
    expandedWorks,
    getYearRangeText,
    handlePortfolioNavClick,
    selectedContent,
    toggleWork,
    workImageMap,
  ]);

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
      {content}
    </Layout>
  );
};

export default Main;
