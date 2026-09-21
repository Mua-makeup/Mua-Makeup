export const TABLE_PAGE_SIZE_KEY = 'mua_table_page_size';

export const getSavedPageSize = (defaultSize = 10) => {
  try {
    const saved = localStorage.getItem(TABLE_PAGE_SIZE_KEY);
    const parsed = parseInt(saved, 10);
    return [10, 20, 50, 100].includes(parsed) ? parsed : defaultSize;
  } catch {
    return defaultSize;
  }
};

export const savePageSize = (size) => {
  try {
    localStorage.setItem(TABLE_PAGE_SIZE_KEY, String(size));
  } catch (e) {
    console.error('Failed to save page size:', e);
  }
};
