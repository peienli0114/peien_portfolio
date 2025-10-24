import { useMemo } from 'react';
import experienceDataset from '../work_list/experienceData.json';
import {
  ExperienceDataset,
  ExperienceEntry,
  ExperienceGroup,
} from '../types/portfolio';

const dataset = experienceDataset as ExperienceDataset;

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

const parseDateKey = (value: string): number => {
  if (!value) {
    return 0;
  }
  const trimmed = value.trim();

  const monthMatch = trimmed.match(/^([A-Za-z]+)[-/\s]+(\d{2,4})$/);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const month = MONTH_MAP[monthName] ?? 1;
    let year = parseInt(monthMatch[2], 10) || 0;
    if (year < 100 && year > 0) {
      year += year >= 50 ? 1900 : 2000;
    }
    return year * 100 + month;
  }

  const cleaned = trimmed
    .replace(/年/g, '/')
    .replace(/月/g, '')
    .replace(/\./g, '/')
    .replace(/-/g, '/');
  const parts = cleaned.split(/[^0-9]/).filter(Boolean);
  if (!parts.length) {
    return 0;
  }
  let year = parseInt(parts[0], 10) || 0;
  if (year < 100 && year > 0) {
    year += year >= 50 ? 1900 : 2000;
  }
  const month = parts.length > 1 ? parseInt(parts[1], 10) || 12 : 12;
  return year * 100 + Math.min(Math.max(month, 1), 12);
};

const sortExperiences = (items: ExperienceEntry[]): ExperienceEntry[] => {
  const withKeys = items.map((item) => ({
    item,
    endKey: parseDateKey(item.end) || parseDateKey(item.begin),
    beginKey: parseDateKey(item.begin),
  }));

  withKeys.sort((a, b) => {
    if (b.endKey !== a.endKey) {
      return b.endKey - a.endKey;
    }
    return b.beginKey - a.beginKey;
  });

  return withKeys.map(({ item }) => item);
};

const normaliseGroups = (groups?: string[] | null): string[] | null => {
  if (!groups || groups.length === 0) {
    return null;
  }
  const cleaned = groups
    .map((group) => group?.trim())
    .filter((group): group is string => Boolean(group));
  if (!cleaned.length) {
    return null;
  }
  return Array.from(new Set(cleaned));
};

export const useExperienceData = (
  preferredGroups?: string[] | null,
): ExperienceGroup[] => {
  return useMemo(() => {
    const normalisedGroups = normaliseGroups(preferredGroups);
    const filterGroups =
      normalisedGroups && normalisedGroups.length > 0
        ? normalisedGroups
        : ['show_default'];
    const filterSet = new Set(filterGroups);
    const includeAll = filterSet.has('show_all');

    const groupedEntries = new Map<string, ExperienceEntry[]>();

    dataset.entries.forEach((entry) => {
      const entryGroups = entry.showGroups?.length
        ? entry.showGroups
        : entry.showDefault
        ? ['show_default']
        : [];

      const shouldInclude =
        includeAll ||
        entryGroups.some((group) => filterSet.has(group)) ||
        (entryGroups.length === 0 && filterSet.has('show_default'));

      if (!shouldInclude) {
        return;
      }

      if (!groupedEntries.has(entry.type)) {
        groupedEntries.set(entry.type, []);
      }
      groupedEntries.get(entry.type)!.push(entry);
    });

    const groups: ExperienceGroup[] = [];
    dataset.typeOrder.forEach((typeName) => {
      const items = groupedEntries.get(typeName);
      if (!items || !items.length) {
        return;
      }
      groups.push({
        type: typeName,
        items: sortExperiences(items),
      });
      groupedEntries.delete(typeName);
    });

    // Append any remaining types not in typeOrder
    groupedEntries.forEach((items, typeName) => {
      if (!items.length) {
        return;
      }
      groups.push({
        type: typeName,
        items: sortExperiences(items),
      });
    });

    return groups;
  }, [preferredGroups]);
};
