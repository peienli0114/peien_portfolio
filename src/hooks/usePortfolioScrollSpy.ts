import { useEffect } from 'react';
import { PortfolioCategoryWithMatrix, PortfolioCode } from '../types/portfolio';

type Params = {
  enabled: boolean;
  portfolioItems: Array<{ code: PortfolioCode }>;
  categoriesWithMatrix: PortfolioCategoryWithMatrix[];
  getScrollOffset: () => number;
  onActiveChange: (code: PortfolioCode | null) => void;
  updateExpandedCategories: (categoryName: string | null, collapseOthers?: boolean) => void;
  isMobileNavOpen: boolean;
};

export const usePortfolioScrollSpy = ({
  enabled,
  portfolioItems,
  categoriesWithMatrix,
  getScrollOffset,
  onActiveChange,
  updateExpandedCategories,
  isMobileNavOpen,
}: Params) => {
  useEffect(() => {
    if (!enabled) {
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
            nextSection.element.getBoundingClientRect().top - offset <
              focusBottom
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

      const collapseOthers =
        typeof window !== 'undefined' &&
        !window.matchMedia('(max-width: 768px)').matches;

      if (candidate) {
        const sectionCategory = categoriesWithMatrix.find((category) =>
          Boolean(category.itemsMap[candidate!]),
        );
        updateExpandedCategories(sectionCategory?.name ?? null, collapseOthers);
        onActiveChange(candidate);
      } else {
        onActiveChange(null);
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
    enabled,
    categoriesWithMatrix,
    getScrollOffset,
    isMobileNavOpen,
    onActiveChange,
    portfolioItems,
    updateExpandedCategories,
  ]);
};
