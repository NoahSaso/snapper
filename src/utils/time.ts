export enum TimeRange {
  Year = 'year',
  Month = 'month',
  Week = 'week',
  Day = 'day',
  Hour = 'hour',
}

/**
 * Test whether or not a string is a valid time range.
 */
export const isValidTimeRange = (range: string): range is TimeRange =>
  Object.values(TimeRange).includes(range as TimeRange)

// The interval in seconds of data returned from CoinGecko at these ranges.
// https://www.coingecko.com/api/documentation
const rangeInterval: Record<TimeRange, number> = {
  // Daily.
  [TimeRange.Year]: 24 * 60 * 60,
  // Hourly.
  [TimeRange.Month]: 60 * 60,
  [TimeRange.Week]: 60 * 60,
  // Every 5 minutes.
  [TimeRange.Day]: 5 * 60,
  [TimeRange.Hour]: 5 * 60,
}

// The duration in seconds of a given range.
const rangeDuration: Record<TimeRange, number> = {
  [TimeRange.Year]: 365 * 24 * 60 * 60,
  [TimeRange.Month]: 30 * 24 * 60 * 60,
  [TimeRange.Week]: 7 * 24 * 60 * 60,
  [TimeRange.Day]: 24 * 60 * 60,
  [TimeRange.Hour]: 60 * 60,
}

/**
 * Get the constraints of a given range.
 */
export const getRangeConstraints = (range: TimeRange) => {
  const end = Math.floor(Date.now() / 1000)
  const start = end - rangeDuration[range]
  const interval = rangeInterval[range]

  return {
    start,
    end,
    interval,
  }
}
