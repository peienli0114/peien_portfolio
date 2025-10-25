import React, { useMemo } from 'react';
import { PortfolioCode, PortfolioItem, WorkImages } from '../../types/portfolio';
import {
  embedYouTube,
  parseArray,
  resolvePreviewUrl,
} from '../../utils/portfolioAssets';

type PortfolioSectionProps = {
  item: PortfolioItem;
  isActive: boolean;
  isExpanded: boolean;
  isFloating: boolean;
  onToggle: (code: PortfolioCode) => void;
  onScrollToTop: (code: PortfolioCode) => void;
  getYearRangeText: (detail: PortfolioItem['detail']) => string;
  workImages: WorkImages;
};

const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  item,
  isActive,
  isExpanded,
  isFloating,
  onToggle,
  onScrollToTop,
  getYearRangeText,
  workImages,
}) => {
  const detail = item.detail;
  const previewUrl = detail.headPic
    ? resolvePreviewUrl(detail.headPic)
    : workImages.main;
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
  const galleryItems = useMemo(
    () =>
      workImages.gallery.filter((galleryItem) =>
        previewUrl ? galleryItem.src !== previewUrl : true,
      ),
    [workImages.gallery, previewUrl],
  );
  const videoUrls = useMemo(
    () =>
      parseArray(detail.content).filter((link) =>
        /youtube\.com|youtu\.be/.test(link),
      ),
    [detail.content],
  );
  const links = detail.links ?? [];
  const coWorkers = detail.coWorkers ?? [];

  return (
    <section
      id={`portfolio-${item.code}`}
      data-code={item.code}
      className={`portfolio-section${isActive ? ' is-active' : ''}`}
    >
      <div
        className="portfolio-summary-block"
        id={`portfolio-${item.code}-summary`}
      >
        <div className="portfolio-preview">
          {previewUrl ? (
            <img src={previewUrl} alt={`${fullDisplayName} 主視覺`} />
          ) : (
            <span className="portfolio-preview-placeholder">
              主要視覺尚未提供
            </span>
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
                onClick={() => onToggle(item.code)}
              >
                閱讀更多
              </button>
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div
          className="portfolio-details"
          id={`portfolio-${item.code}-details`}
        >
          <div className="portfolio-detail-sticky">
            <div
              className={`portfolio-detail-banner${
                isFloating ? ' is-floating' : ''
              }`}
              aria-hidden={isFloating}
            >
              <div className="portfolio-detail-banner-info">
                <strong>{fullDisplayName}</strong>
              </div>
              <div className="portfolio-detail-banner-actions">
                <button
                  type="button"
                  onClick={() => onScrollToTop(item.code)}
                >
                  ⌅
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => onToggle(item.code)}
                >
                  X
                </button>
              </div>
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
                    <a
                      href={galleryItem.src}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      下載 {fullDisplayName} PDF
                    </a>
                  </object>
                ) : (
                  <img
                    key={`img-${index}`}
                    src={galleryItem.src}
                    alt={`${fullDisplayName} 內容圖像 ${index + 1}`}
                    className="portfolio-gallery-image"
                  />
                ),
              )}
              {videoUrls.map((video, index) => (
                <iframe
                  key={`video-${index}`}
                  src={embedYouTube(video)}
                  title={`${fullDisplayName} 影片 ${index + 1}`}
                  className="portfolio-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ))}
            </div>
          )}
          {coWorkers.length > 0 && (
            <div className="portfolio-meta-block">
              <h4 className="portfolio-meta-title">專案成員</h4>
              <ul className="portfolio-meta-list">
                {coWorkers.map((person, index) => (
                  <li key={`coworker-${index}`}>
                    <span className="portfolio-meta-name">
                      {person.name || '協作者'}
                    </span>
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
};

export default PortfolioSection;
