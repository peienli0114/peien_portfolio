import React, { useEffect } from 'react';
import {
  PortfolioCategoryWithMatrix,
  PortfolioCode,
  WorkDetail,
  WorkImages,
} from '../../types/portfolio';
import { resolvePreviewUrl as resolvePreview } from '../../utils/portfolioAssets';
import { useHorizontalScrollIndicators } from '../../hooks/useHorizontalScrollIndicators';

type PortfolioOverviewProps = {
  categories: PortfolioCategoryWithMatrix[];
  activePortfolio: PortfolioCode | null;
  onNavigate: (code: PortfolioCode) => void;
  getYearRangeText: (detail: WorkDetail) => string;
  workImageMap: Record<string, WorkImages>;
  overviewRef: React.RefObject<HTMLDivElement | null>;
};

const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  categories,
  activePortfolio,
  onNavigate,
  getYearRangeText,
  workImageMap,
  overviewRef,
}) => {
  const { registerRow, handleScroll, scrollState, refreshAll } =
    useHorizontalScrollIndicators();

  useEffect(() => {
    refreshAll();
  }, [categories, refreshAll]);

  return (
    <div
      ref={overviewRef}
      className="portfolio-overview"
      aria-labelledby="portfolio-overview-heading"
    >
      <div className="portfolio-overview-header">
        <h2 id="portfolio-overview-heading">作品集目錄</h2>
        <p>依分類快速預覽作品，點擊卡片即可跳轉至下方詳細介紹。</p>
      </div>
      {categories.map((category) => {
        if (!category.items.length) {
          return null;
        }
        return (
          <div
            className="portfolio-overview-category"
            key={`overview-${category.name}`}
          >
            <h3 className="portfolio-overview-title">{category.name}</h3>
            <div className="portfolio-overview-row">
              <button
                type="button"
                className="portfolio-overview-scroll is-left"
                onClick={() => handleScroll(category.name, 'left')}
                disabled={!scrollState[category.name]?.left}
                aria-label={`${category.name} 往左捲動`}
              >
                ‹
              </button>
              <div
                className="portfolio-overview-items"
                ref={registerRow(category.name)}
              >
                {category.items.map((item) => {
                  const detail = item.detail;
                  const preview = detail.headPic
                    ? resolvePreview(detail.headPic)
                    : workImageMap[item.code.toLowerCase()]?.main || null;
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
                      onClick={() => onNavigate(item.code)}
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
                onClick={() => handleScroll(category.name, 'right')}
                disabled={!scrollState[category.name]?.right}
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
};

export default PortfolioOverview;
