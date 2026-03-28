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

export type { IResponseMeta, IResponse };