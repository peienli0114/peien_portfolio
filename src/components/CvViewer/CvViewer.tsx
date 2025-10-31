import React, { useState } from 'react';
import {
  CvSettings,
  ExperienceGroup,
  PortfolioCode,
  WorkDetail,
} from '../../types/portfolio';

const CONTACT_LINKS: Array<{ label: string; value: string; href: string }> = [
  {
    label: 'Email',
    value: 'peien.li0114@gmail.com',
    href: 'mailto:peien.li0114@gmail.com',
  },
  {
    label: 'LinkedIn',
    value: '',
    href: 'https://www.linkedin.com/in/383415171',
  },
  {
    label: 'LeetCode',
    value: '',
    href: 'https://leetcode.com/u/piaopiaoen/',
  },
];

type CvViewerProps = {
  settings: CvSettings;
  experienceGroups: ExperienceGroup[];
  workDetailMap: Record<string, WorkDetail>;
  onNavigateToWork?: (code: PortfolioCode) => void;
};

const splitDescription = (content: string): string[] =>
  content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const normaliseYear = (value: number): number => {
  if (value < 100 && value > 0) {
    return value >= 50 ? 1900 + value : 2000 + value;
  }
  return value;
};

const parseDateParts = (
  raw: string,
): { year: number; month: number | null } | null => {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed
    .replace(/年/g, '/')
    .replace(/月/g, '')
    .replace(/\./g, '/')
    .replace(/-/g, '/');
  const tokens = cleaned.split(/[/\s]+/).filter(Boolean);
  if (!tokens.length) {
    return null;
  }

  let year: number | null = null;
  let month: number | null = null;

  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (month === null && MONTH_MAP[lower]) {
      month = MONTH_MAP[lower];
      return;
    }
    const numeric = Number(token);
    if (Number.isNaN(numeric)) {
      return;
    }
    if (numeric > 31 || token.length > 2 || year === null) {
      year = normaliseYear(numeric);
      return;
    }
    if (month === null && numeric >= 1 && numeric <= 12) {
      month = numeric;
    }
  });

  if (year === null) {
    const fallbackToken = tokens.find((token) => !Number.isNaN(Number(token)));
    if (fallbackToken) {
      year = normaliseYear(Number(fallbackToken));
    }
  }

  if (month === null) {
    const monthToken = tokens.find((token) =>
      Boolean(MONTH_MAP[token.toLowerCase()]),
    );
    if (monthToken) {
      month = MONTH_MAP[monthToken.toLowerCase()];
    }
  }

  if (year === null) {
    return null;
  }

  return {
    year,
    month: month ? Math.min(Math.max(month, 1), 12) : null,
  };
};

const formatDate = (value: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }
  if (/^present$/i.test(trimmed)) {
    return 'Present';
  }
  const parsed = parseDateParts(trimmed);
  if (!parsed) {
    return trimmed;
  }
  const { year, month } = parsed;
  if (month) {
    return `${year}/${month.toString().padStart(2, '0')}`;
  }
  return `${year}`;
};

const formatRange = (begin: string, end: string): string => {
  const beginFormatted = formatDate(begin);
  const endFormatted = formatDate(end);

  const hasBegin = Boolean(beginFormatted);
  const hasEnd = Boolean(endFormatted);

  if (hasBegin && hasEnd && endFormatted !== 'Present') {
    if (beginFormatted === endFormatted) {
      return beginFormatted;
    }
    return `${beginFormatted} – ${endFormatted}`;
  }

  if (hasBegin) {
    const resolvedEnd = hasEnd ? endFormatted : 'Present';
    return `${beginFormatted} – ${resolvedEnd}`;
  }

  return hasEnd ? endFormatted : '';
};

const CvViewer: React.FC<CvViewerProps> = ({
  settings,
  experienceGroups,
  workDetailMap,
  onNavigateToWork,
}) => {
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  const handleWorkClick = (code: string) => {
    if (onNavigateToWork) {
      onNavigateToWork(code);
    }
  };

  const toggleEntry = (key: string) => {
    setExpandedEntries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isMobileViewport = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 768px)').matches;

  const handleEntryClick = (
    event: React.MouseEvent<HTMLElement>,
    key: string,
    isExpandableEntry: boolean,
  ) => {
    if (!isExpandableEntry) {
      return;
    }
    if (isMobileViewport()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && target.closest('button, a')) {
      return;
    }
    toggleEntry(key);
  };

  const handleEntryKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    key: string,
    isExpandableEntry: boolean,
  ) => {
    if (!isExpandableEntry) {
      return;
    }
    if (event.target instanceof HTMLElement && event.target.closest('button, a')) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleEntry(key);
    }
  };

  return (
    <section className="cv-section">
      <header className="cv-header">
        <div className="cv-header-info">
          <h2 className="cv-title">CV</h2>
          {settings.link && (
            <a
              className="cv-online-link"
              href={settings.link}
              target="_blank"
              rel="noreferrer"
            >
              完整履歷連結(Google Drive)
            </a>
          )}
          <div className="cv-contact">
            {CONTACT_LINKS.map(({ label, value, href }) => (
              <a
                key={label}
                className="cv-contact-item"
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noreferrer' : undefined}
              >
                <span className="cv-contact-label">{label}</span>
                {value ? (
                  <span className="cv-contact-value">{value}</span>
                ) : null}
              </a>
            ))}
          </div>
        </div>
      </header>

      <div className="cv-experience">
        {experienceGroups.map((group, groupIndex) => (
          <section className="cv-experience-group" key={group.type}>
            <h3 className="cv-group-title">{group.type}</h3>
            <div className="cv-group-list">
              {group.items.map((item, index) => {
                const period = formatRange(item.begin, item.end);
                const paragraphs = splitDescription(item.description);
                const hasRelatedWorks =
                  Array.isArray(item.relatedWorks) && item.relatedWorks.length > 0;
                const tags = Array.isArray(item.tags)
                  ? item.tags.filter((tag) => Boolean(tag && tag.trim()))
                  : [];
                const entryKey = `${group.type}-${index}`;
                const sanitizedGroupKey = group.type
                  .replace(/\s+/g, '-')
                  .replace(/[^a-zA-Z0-9-_]/g, '')
                  .toLowerCase();
                const entryId = `cv-entry-${sanitizedGroupKey || groupIndex}-${index}`;
                const isExpandable = paragraphs.length > 0;
                const isExpanded = isExpandable
                  ? Boolean(expandedEntries[entryKey])
                  : true;

                return (
                  <article
                    key={`${item.organisation}-${index}`}
                    className={`cv-entry${isExpandable ? ' is-expandable' : ''}`}
                    onClick={(event) => handleEntryClick(event, entryKey, isExpandable)}
                    onKeyDown={(event) => handleEntryKeyDown(event, entryKey, isExpandable)}
                    role={isExpandable ? 'button' : undefined}
                    tabIndex={isExpandable ? 0 : undefined}
                    aria-expanded={isExpandable ? isExpanded : undefined}
                  >
                    <header className="cv-entry-header">
                      <div className="cv-entry-heading">
                        <h4 className="cv-entry-organisation">{item.organisation}</h4>
                        <div className="cv-entry-role-line">
                          {item.role && (
                            <span className="cv-entry-role">{item.role}</span>
                          )}
                          {tags.length > 0 && (
                            <div className="cv-entry-tags">
                              {tags.map((tag, idx) => (
                                <span className="cv-tag-chip" key={`${tag}-${idx}`}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {hasRelatedWorks && (
                          <div className="cv-entry-related-inline">
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
                      </div>
                      <div className="cv-entry-period-block">
                        {period && <span className="cv-entry-period">{period}</span>}
                      </div>
                      <div className="cv-entry-header-actions">
                        {isExpandable ? (
                          <button
                            type="button"
                            className="cv-entry-toggle"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleEntry(entryKey);
                            }}
                            aria-expanded={isExpanded}
                            aria-controls={`${entryId}-details`}
                            aria-label={isExpanded ? '收合詳情' : '展開詳情'}
                          >
                            <span className="cv-entry-toggle-icon" aria-hidden="true">
                              {isExpanded ? '▴' : '▾'}
                            </span>
                          </button>
                        ) : (
                          <span className="cv-entry-toggle-spacer" aria-hidden="true" />
                        )}
                      </div>
                    </header>
                    {isExpandable && (
                      <div
                        className={`cv-entry-details${isExpanded ? ' is-expanded' : ''}`}
                        id={`${entryId}-details`}
                        aria-hidden={!isExpanded}
                      >
                        <div className="cv-entry-details-body">
                          <div className="cv-entry-description">
                            <ul>
                              {paragraphs.map((paragraph, paragraphIndex) => (
                                <li key={paragraphIndex}>{paragraph}</li>
                              ))}
                            </ul>
                          </div>
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
