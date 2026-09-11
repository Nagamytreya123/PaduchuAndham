export type ProductListPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedProductListResponse = {
  products: import('./product').ProductSummary[];
  pagination?: ProductListPagination;
};
