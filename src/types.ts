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

export type QueryTypeUrlOptions<Body = unknown> = {
  /**
   * The URL method for the query. Defaults to GET.
   */
  method?: 'GET' | 'POST'
  /**
   * The URL, or a function to get the URL for the query using the parameters.
   */
  url: string | ((params: Record<string, string>) => string)
  /**
   * The HTTP headers, or a function to get the HTTP headers for the query using
   * the parameters.
   */
  headers?:
    | Record<string, string>
    | ((params: Record<string, string>) => Record<string, string>)
  /**
   * Transform the response body.
   */
  transform?: (
    body: Record<string, unknown>,
    params: Record<string, string>
  ) => Body
}

export type QueryTypeCustomOptions<Body = unknown> = {
  /**
   * The function to call for the query. It will be called with the parameters
   * and a function to fetch other queries.
   */
  execute: (
    params: Record<string, string>,
    fetchQuery: <InnerBody = unknown>(
      query: Query<InnerBody>,
      params: Record<string, string>
    ) => Promise<QueryState<InnerBody>>
  ) => Body | Promise<Body>
}

export type Query<Body = unknown> = {
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
  validate?: (params: Record<string, string>) => boolean | Error
  /**
   * How long the query is valid for, in seconds, or a function to get it.
   * Defaults to 60. Set to 0 to disable.
   */
  ttl: number | ((params: Record<string, string>) => number)
  /**
   * Whether or not to automatically revalidate the query when it expires, or a
   * function to get it. Defaults to true.
   */
  revalidate?: boolean | ((params: Record<string, string>) => boolean)
} & (
  | ({
      type: QueryType.Url
    } & QueryTypeUrlOptions<Body>)
  | ({
      type: QueryType.Custom
    } & QueryTypeCustomOptions<Body>)
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
