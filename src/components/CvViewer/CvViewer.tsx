import React from 'react';
import {
  CvSettings,
  ExperienceGroup,
  PortfolioCode,
  WorkDetail,
} from '../../types/portfolio';

type CvViewerProps = {
  settings: CvSettings;
  experienceGroups: ExperienceGroup[];
  workDetailMap: Record<string, WorkDetail>;
  onNavigateToWork?: (code: PortfolioCode) => void;
};

const formatRange = (begin: string, end: string): string => {
  const beginTrimmed = begin?.trim();
  const endTrimmed = end?.trim();
  if (beginTrimmed && endTrimmed) {
    if (beginTrimmed === endTrimmed) {
      return beginTrimmed;
    }
    return `${beginTrimmed} – ${endTrimmed}`;
  }
  if (beginTrimmed) {
    return `${beginTrimmed} – Present`;
  }
  return endTrimmed || '';
};

const splitDescription = (content: string): string[] =>
  content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const CvViewer: React.FC<CvViewerProps> = ({
  settings,
  experienceGroups,
  workDetailMap,
  onNavigateToWork,
}) => {
  const handleWorkClick = (code: string) => {
    if (onNavigateToWork) {
      onNavigateToWork(code);
    }
  };

  const downloadHref = settings.downloadUrl ?? settings.link ?? null;

  return (
    <section className="cv-section">
      <header className="cv-header">
        <div className="cv-header-info">
          <h2 className="cv-title">Curriculum Vitae</h2>
          <p className="cv-subtitle">
            精選教育、專案與工作經歷，展示跨領域設計研究與數據分析的成果。
          </p>
          {settings.link && (
            <a
              href={settings.link}
              target="_blank"
              rel="noopener noreferrer"
              className="cv-online-link"
            >
              下載完整履歷（Google Drive）
            </a>
          )}
        </div>
      </header>

      <div className="cv-experience">
        {experienceGroups.map((group) => (
          <section className="cv-experience-group" key={group.type}>
            <h3 className="cv-group-title">{group.type}</h3>
            <div className="cv-group-list">
              {group.items.map((item, index) => {
                const period = formatRange(item.begin, item.end);
                const paragraphs = splitDescription(item.description);
                const hasRelatedWorks =
                  item.relatedWorks && item.relatedWorks.length > 0;

                return (
                  <article className="cv-entry" key={`${item.organisation}-${index}`}>
                    <header className="cv-entry-header">
                      <div className="cv-entry-heading">
                        <h4 className="cv-entry-organisation">
                          {item.organisation}
                        </h4>
                        {item.role && (
                          <span className="cv-entry-role">{item.role}</span>
                        )}
                      </div>
                      {period && (
                        <span className="cv-entry-period">{period}</span>
                      )}
                    </header>
                    {paragraphs.length > 0 && (
                      <div className="cv-entry-description">
                        <ul>
                          {paragraphs.map((paragraph, paragraphIndex) => (
                            <li key={paragraphIndex}>{paragraph}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasRelatedWorks && (
                      <div className="cv-entry-related">
                        <span className="cv-related-label">相關作品：</span>
                        <div className="cv-related-list">
                          {item.relatedWorks.map((code) => {
                            const detail = workDetailMap[code];
                            const name =
                              detail?.tableName ||
                              detail?.fullName ||
                              code.toUpperCase();
                            return (
                              <button
                                key={code}
                                type="button"
                                className="cv-related-chip"
                                onClick={() => handleWorkClick(code)}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {experienceGroups.length === 0 && (
          <p className="cv-empty">目前尚未提供履歷內容。</p>
        )}
      </div>
    </section>
  );
};

export default CvViewer;
