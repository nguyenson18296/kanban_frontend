interface IResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface IResponse<T> {
  data: T;
  meta: IResponseMeta;
}

interface IQueryParams {
  page?: number;
  limit?: number;
}

export type { IResponseMeta, IResponse, IQueryParams };