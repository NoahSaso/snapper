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


// The duration in seconds of a given range.
const rangeDuration: Record<TimeRange, number> = {
  [TimeRange.Year]: 365 * 24 * 60 * 60,
  [TimeRange.Month]: 30 * 24 * 60 * 60,
  [TimeRange.Week]: 7 * 24 * 60 * 60,
  [TimeRange.Day]: 24 * 60 * 60,
  [TimeRange.Hour]: 60 * 60,
}

/**
 * Get the bounds of a given range.
 */
export const getRangeBounds = (range: TimeRange) => {
  const end = Math.floor(Date.now() / 1000)
  const start = end - rangeDuration[range]

  return {
    start,
    end,
  }
}
