import React, { useCallback } from 'react';
import PortfolioOverview from './PortfolioOverview';
import PortfolioSection from './PortfolioSection';
import {
  PortfolioCategoryWithMatrix,
  PortfolioCode,
  WorkDetail,
  WorkImages,
} from '../../types/portfolio';

type PortfolioContentProps = {
  categories: PortfolioCategoryWithMatrix[];
  activePortfolio: PortfolioCode | null;
  expandedWorks: PortfolioCode[];
  onToggleWork: (code: PortfolioCode) => void;
  onNavigate: (code?: PortfolioCode) => void;
  getYearRangeText: (detail: WorkDetail) => string;
  workImageMap: Record<string, WorkImages>;
  overviewRef: React.RefObject<HTMLDivElement | null>;
  floatingWorkCode: PortfolioCode | null;
};

const PortfolioContent: React.FC<PortfolioContentProps> = ({
  categories,
  activePortfolio,
  expandedWorks,
  onToggleWork,
  onNavigate,
  getYearRangeText,
  workImageMap,
  overviewRef,
  floatingWorkCode,
}) => {
  const handleScrollToTop = useCallback((code: PortfolioCode) => {
    const section = document.getElementById(`portfolio-${code}`);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const hasPortfolio = categories.some((category) => category.items.length > 0);

  if (!hasPortfolio) {
    return (
      <div className="content-wrapper">
        <h2>作品集</h2>
        <p>目前這個路徑尚未配置要顯示的作品。</p>
      </div>
    );
  }

  return (
    <>
      <PortfolioOverview
        categories={categories}
        activePortfolio={activePortfolio}
        onNavigate={(code) => onNavigate(code)}
        getYearRangeText={getYearRangeText}
        workImageMap={workImageMap}
        overviewRef={overviewRef}
      />
      <div className="portfolio-container">
        {categories.map((category) => (
          <React.Fragment key={category.name}>
            {category.items.length > 0 && (
              <div
                className="portfolio-category-divider"
                data-category={category.name}
              >
                <span>{category.name}</span>
              </div>
            )}
            {category.items.map((item) => (
              <PortfolioSection
                key={item.code}
                item={item}
                isActive={activePortfolio === item.code}
                isExpanded={expandedWorks.includes(item.code)}
                isFloating={floatingWorkCode === item.code}
                onToggle={onToggleWork}
                onScrollToTop={handleScrollToTop}
                getYearRangeText={getYearRangeText}
                workImages={
                  workImageMap[item.code.toLowerCase()] ?? {
                    main: null,
                    gallery: [],
                    videos: [],
                  }
                }
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

export default PortfolioContent;
