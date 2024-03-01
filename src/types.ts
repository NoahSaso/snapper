/**
 * The type of a query.
 */
export enum QueryType {
  /**
   * Query that fetches data from an API.
   */
  Url = 'url',
  /**
   * Query that calls a function.
   */
  Custom = 'custom',
}

export type QueryTypeUrlOptions<
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
> = {
  /**
   * The URL method for the query. Defaults to GET.
   */
  method?: 'GET' | 'POST'
  /**
   * The URL, or a function to get the URL for the query using the parameters.
   */
  url: string | ((params: Parameters) => string)
  /**
   * The HTTP headers, or a function to get the HTTP headers for the query using
   * the parameters.
   */
  headers?:
    | Record<string, string>
    | ((params: Parameters) => Record<string, string>)
  /**
   * The HTTP POST request data, or a function to get the HTTP POST request data
   * for the query using the parameters. Only used if `method` is `POST`.
   */
  data?:
    | string
    | Record<string, any>
    | ((params: Parameters) => string | Record<string, any>)
  /**
   * Transform the response body.
   */
  transform?: (body: Record<string, unknown>, params: Parameters) => Body
}

export type QueryTypeCustomOptions<
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
> = {
  /**
   * The function to call for the query. It will be called with the parameters
   * and a function to fetch other queries.
   */
  execute: (
    params: Parameters,
    fetchQuery: <
      InnerBody = unknown,
      InnerParameters extends Record<string, string> = Record<string, string>,
    >(
      query: Query<InnerBody, InnerParameters>,
      params: InnerParameters
    ) => Promise<QueryState<InnerBody>>
  ) => Body | Promise<Body>
}

export type Query<
  Body = unknown,
  Parameters extends Record<string, string> = Record<string, string>,
> = {
  /**
   * Unique query name. Must be URL-safe since it will be used in URLs.
   */
  name: string
  /**
   * Required parameters for the query.
   */
  parameters?: string[]
  /**
   * Optional parameters for the query.
   */
  optionalParameters?: string[]
  /**
   * Parameter validation function. Errors thrown or returned will be sent in
   * the response. If it returns `false`, a generic error will be sent.
   */
  validate?: (params: Parameters) => boolean | Error
  /**
   * How long the query is valid for, in seconds, or a function to get it.
   * Defaults to 60. Set to 0 to disable.
   */
  ttl: number | ((params: Parameters) => number)
  /**
   * Whether or not to automatically revalidate the query when it expires, or a
   * function to get it. Defaults to true.
   */
  revalidate?: boolean | ((params: Parameters) => boolean)
} & (
  | ({
      type: QueryType.Url
    } & QueryTypeUrlOptions<Body, Parameters>)
  | ({
      type: QueryType.Custom
    } & QueryTypeCustomOptions<Body, Parameters>)
)

export type QueryState<Body = unknown> = {
  /**
   * The response status code for the query. Defined if the query type is URL.
   */
  status?: number
  /**
   * The response status text for the query. Defined if the query type is URL.
   */
  statusText?: string
  /**
   * The response body for the query.
   */
  body: Body
  /**
   * The response time (in unix ms since epoch) for the query.
   */
  fetchedAt: number
}
