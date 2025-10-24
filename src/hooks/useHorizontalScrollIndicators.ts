import {
  MutableRefObject,
  useCallback,
  useRef,
  useState,
} from 'react';

type ScrollState = Record<string, { left: boolean; right: boolean }>;

type ListenerMap = Record<string, () => void>;
type ElementMap = Record<string, HTMLDivElement | null>;

const getDelta = (node: HTMLDivElement) => node.clientWidth * 0.75;

export const useHorizontalScrollIndicators = () => {
  const rowRefs = useRef<ElementMap>({});
  const listenerRefs = useRef<ListenerMap>({});
  const [scrollState, setScrollState] = useState<ScrollState>({});

  const updateState = useCallback((name: string) => {
    const node = rowRefs.current[name];
    if (!node) {
      setScrollState((prev) => {
        if (!(name in prev)) {
          return prev;
        }
        const { [name]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = node;
    const left = scrollLeft > 8;
    const right = scrollLeft + clientWidth < scrollWidth - 8;
    setScrollState((prev) => {
      const prevEntry = prev[name];
      if (prevEntry && prevEntry.left === left && prevEntry.right === right) {
        return prev;
      }
      return { ...prev, [name]: { left, right } };
    });
  }, []);

  const registerRow = useCallback(
    (name: string) => (node: HTMLDivElement | null) => {
      const prevNode = rowRefs.current[name];
      const prevListener = listenerRefs.current[name];

      if (prevNode === node) {
        return;
      }

      if (prevNode && prevListener) {
        prevNode.removeEventListener('scroll', prevListener);
      }

      if (!node) {
        delete rowRefs.current[name];
        delete listenerRefs.current[name];
        setScrollState((prev) => {
          if (!(name in prev)) {
            return prev;
          }
          const { [name]: _removed, ...rest } = prev;
          return rest;
        });
        return;
      }

      rowRefs.current[name] = node;
      const handler = () => updateState(name);
      listenerRefs.current[name] = handler;
      node.addEventListener('scroll', handler);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => handler());
      } else {
        handler();
      }
    },
    [updateState],
  );

  const handleScroll = useCallback((name: string, direction: 'left' | 'right') => {
    const node = rowRefs.current[name];
    if (!node) {
      return;
    }
    node.scrollBy({
      left: direction === 'left' ? -getDelta(node) : getDelta(node),
      behavior: 'smooth',
    });
  }, []);

  const refreshAll = useCallback(() => {
    Object.keys(rowRefs.current).forEach((name) => updateState(name));
  }, [updateState]);

  return {
    registerRow,
    handleScroll,
    scrollState,
    refreshAll,
    rowRefs: rowRefs as MutableRefObject<ElementMap>,
  };
};
