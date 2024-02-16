export type Query = {
  /**
   * Unique query name. Must be URL-safe since it will be used in URLs.
   */
  name: string
  /**
   * Parameters for the query. These should be used in at least the `url` or
   * `headers` function.
   */
  parameters?: string[]
  /**
   * Parameter validation function. Errors thrown or returned will be sent in
   * the response. If it returns `false`, a generic error will be sent.
   */
  validate?: (params: Record<string, string>) => boolean | Error
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
  ) => unknown
  /**
   * How long the query is valid for, in seconds, or a function to get it.
   * Defaults to 60. Set to 0 to disable.
   */
  ttl: number | ((params: Record<string, string>) => number)
  /**
   * Whether or not to automatically revalidate the query when it expires.
   * Defaults to true.
   */
  revalidate?: boolean
}

export type QueryState = {
  /**
   * The response status code for the query.
   */
  status: number
  /**
   * The response status text for the query.
   */
  statusText: string
  /**
   * The response body for the query.
   */
  body?: Record<string, unknown>
  /**
   * The response time (in unix ms since epoch) for the query.
   */
  fetchedAt: number
}
