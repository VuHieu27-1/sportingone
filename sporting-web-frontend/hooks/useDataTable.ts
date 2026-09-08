import { useState, useMemo, useEffect } from 'react';

export interface UseDataTableOptions<T> {
  data: T[];
  initialPageSize?: number;
  initialSortField?: string | null;
  initialSortDirection?: 'asc' | 'desc';
  searchFields?: Array<keyof T | ((item: T) => string)>;
  sortAccessors?: Record<string, (item: T) => any>; // Custom accessors for sorting specific fields
  storageKey?: string; // Optional key to persist pageSize in localStorage
  urlPrefix?: string; // Optional prefix if page has multiple tables
  syncUrl?: boolean; // Whether to sync pagination & filter state to URL (defaults to true)
}

export interface UseDataTableResult<T> {
  paginatedData: T[];
  filteredData: T[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  globalSearch: string;
  columnFilters: Record<string, string>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: (size: number) => void;
  setGlobalSearch: (search: string) => void;
  setColumnFilter: (field: string, value: string) => void;
  clearColumnFilters: () => void;
  handleSort: (field: string) => void;
  startIndex: number;
  endIndex: number;
}

const DEFAULT_PAGE_SIZE_KEY = 'sporting_data_table_page_size';

function getUrlParam(key: string, urlPrefix?: string): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fullKey = urlPrefix ? `${urlPrefix}_${key}` : key;
  return params.get(fullKey);
}

function getUrlFilterParams(urlPrefix?: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const filterPrefix = urlPrefix ? `${urlPrefix}_f_` : 'f_';
  const filters: Record<string, string> = {};

  params.forEach((val, key) => {
    if (key.startsWith(filterPrefix)) {
      const field = key.slice(filterPrefix.length);
      if (field && val) {
        filters[field] = val;
      }
    }
  });

  return filters;
}

function getRawFieldValue<T>(
  item: T,
  field: string,
  sortAccessors?: Record<string, (item: T) => any>
): any {
  if (sortAccessors && sortAccessors[field]) {
    return sortAccessors[field](item);
  }

  const val = (item as any)?.[field];
  if (val === null || val === undefined) return '';

  if (typeof val === 'object') {
    if ('vendorName' in val) return val.vendorName;
    if ('username' in val) return val.username;
    if ('yardName' in val) return val.yardName;
    if ('sportName' in val) return val.sportName;
    if ('typeName' in val) return val.typeName;
    if ('name' in val) return val.name;
    if ('id' in val) return val.id;
  }

  return val;
}

function parseNumericIfPossible(val: any): number | null {
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      return isNaN(num) ? null : num;
    }

    const cleanStr = trimmed.replace(/\s*(VNĐ|VND|đ|Xu|VND)\s*/gi, '');

    if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleanStr)) {
      const normalized = cleanStr.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(normalized);
      return isNaN(num) ? null : num;
    }

    if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleanStr)) {
      const normalized = cleanStr.replace(/,/g, '');
      const num = parseFloat(normalized);
      return isNaN(num) ? null : num;
    }
  }

  return null;
}

export function useDataTable<T extends Record<string, any>>({
  data = [],
  initialPageSize = 10,
  initialSortField = null,
  initialSortDirection = 'asc',
  searchFields = [],
  sortAccessors = {},
  storageKey = DEFAULT_PAGE_SIZE_KEY,
  urlPrefix = '',
  syncUrl = true,
}: UseDataTableOptions<T>): UseDataTableResult<T> {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    const urlVal = getUrlParam('pageSize', urlPrefix);
    if (urlVal) {
      const parsed = parseInt(urlVal, 10);
      if ([5, 10, 20, 50, 100].includes(parsed)) return parsed;
    }
    if (typeof window !== 'undefined' && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([5, 10, 20, 50, 100].includes(parsed)) {
          return parsed;
        }
      }
    }
    return initialPageSize;
  });

  const [currentPage, setCurrentPage] = useState<number>(() => {
    const urlVal = getUrlParam('page', urlPrefix);
    if (urlVal) {
      const parsed = parseInt(urlVal, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 1;
  });

  const [sortField, setSortField] = useState<string | null>(() => {
    return getUrlParam('sort', urlPrefix) || initialSortField;
  });

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const dir = getUrlParam('sortDir', urlPrefix);
    if (dir === 'asc' || dir === 'desc') return dir;
    return initialSortDirection;
  });

  const [globalSearch, setGlobalSearchState] = useState<string>(() => {
    return getUrlParam('search', urlPrefix) || getUrlParam('q', urlPrefix) || '';
  });

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(() => {
    return getUrlFilterParams(urlPrefix);
  });

  // Sync state changes to URL query params without reloading the page
  useEffect(() => {
    if (typeof window === 'undefined' || !syncUrl) return;

    const url = new URL(window.location.href);
    const params = url.searchParams;

    const pageKey = urlPrefix ? `${urlPrefix}_page` : 'page';
    const sizeKey = urlPrefix ? `${urlPrefix}_pageSize` : 'pageSize';
    const searchKey = urlPrefix ? `${urlPrefix}_search` : 'search';
    const sortKey = urlPrefix ? `${urlPrefix}_sort` : 'sort';
    const sortDirKey = urlPrefix ? `${urlPrefix}_sortDir` : 'sortDir';
    const filterPrefix = urlPrefix ? `${urlPrefix}_f_` : 'f_';

    // 1. Page
    if (currentPage > 1) {
      params.set(pageKey, String(currentPage));
    } else {
      params.delete(pageKey);
    }

    // 2. PageSize
    if (pageSize !== initialPageSize) {
      params.set(sizeKey, String(pageSize));
    } else {
      params.delete(sizeKey);
    }

    // 3. Search
    if (globalSearch.trim() !== '') {
      params.set(searchKey, globalSearch.trim());
    } else {
      params.delete(searchKey);
    }

    // 4. Sort
    if (sortField) {
      params.set(sortKey, sortField);
      params.set(sortDirKey, sortDirection);
    } else {
      params.delete(sortKey);
      params.delete(sortDirKey);
    }

    // 5. Column Filters
    Array.from(params.keys()).forEach((key) => {
      if (key.startsWith(filterPrefix)) {
        params.delete(key);
      }
    });
    Object.entries(columnFilters).forEach(([field, val]) => {
      if (val && val.trim() !== '') {
        params.set(`${filterPrefix}${field}`, val.trim());
      }
    });

    const newSearch = params.toString();
    const newUrl = `${url.pathname}${newSearch ? '?' + newSearch : ''}${url.hash}`;

    if (window.location.href !== newUrl) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [currentPage, pageSize, globalSearch, sortField, sortDirection, columnFilters, urlPrefix, initialPageSize, syncUrl]);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
    if (typeof window !== 'undefined' && storageKey) {
      localStorage.setItem(storageKey, String(size));
    }
  };

  const setGlobalSearch = (search: string) => {
    setGlobalSearchState(search);
    setCurrentPage(1);
  };

  const setColumnFilter = (field: string, value: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!value || value.trim() === '') {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
    setCurrentPage(1);
  };

  const clearColumnFilters = () => {
    setColumnFilters({});
    setGlobalSearchState('');
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    let result = [...data];

    if (globalSearch.trim() !== '') {
      const term = globalSearch.toLowerCase().trim();
      result = result.filter((item) => {
        if (searchFields.length > 0) {
          return searchFields.some((field) => {
            let val: any;
            if (typeof field === 'function') {
              val = field(item);
            } else {
              val = getRawFieldValue(item, String(field), sortAccessors);
            }
            return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
          });
        }
        // Fallback: search all values of object
        return Object.values(item).some(
          (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(term)
        );
      });
    }

    // Column Filters
    if (Object.keys(columnFilters).length > 0) {
      result = result.filter((item) => {
        return Object.entries(columnFilters).every(([field, filterVal]) => {
          if (!filterVal || filterVal.trim() === '') return true;
          const targetVal = getRawFieldValue(item, field, sortAccessors);
          if (targetVal === null || targetVal === undefined) return false;
          const strTarget = String(targetVal).toLowerCase().trim();
          const strFilter = filterVal.toLowerCase().trim();
          if (field === 'status') {
            return strTarget === strFilter;
          }
          return strTarget.includes(strFilter);
        });
      });
    }

    return result;
  }, [data, globalSearch, columnFilters, searchFields, sortAccessors]);

  // 2. Sort data
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = getRawFieldValue(a, sortField, sortAccessors);
      const valB = getRawFieldValue(b, sortField, sortAccessors);

      if ((valA === null || valA === undefined || valA === '') && (valB === null || valB === undefined || valB === '')) {
        return 0;
      }
      if (valA === null || valA === undefined || valA === '') {
        return sortDirection === 'asc' ? 1 : -1;
      }
      if (valB === null || valB === undefined || valB === '') {
        return sortDirection === 'asc' ? -1 : 1;
      }

      const numA = parseNumericIfPossible(valA);
      const numB = parseNumericIfPossible(valB);

      if (numA !== null && numB !== null) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA);
      const strB = String(valB);
      const comparison = strA.localeCompare(strB, 'vi', { numeric: true, sensitivity: 'base' });

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection, sortAccessors]);

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (data.length > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, data.length]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = useMemo(() => {
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex]);

  return {
    paginatedData,
    filteredData: sortedData,
    totalItems,
    currentPage,
    pageSize,
    totalPages,
    sortField,
    sortDirection,
    globalSearch,
    columnFilters,
    setCurrentPage,
    setPageSize,
    setGlobalSearch,
    setColumnFilter,
    clearColumnFilters,
    handleSort,
    startIndex,
    endIndex,
  };
}
