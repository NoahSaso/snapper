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
 * Get the bounds in seconds of a given range. Optionally override the end time.
 * Defaults the end to the current time.
 */
export const getRangeBounds = (range: TimeRange, endDate = new Date()) => {
  // Snap to a reasonable point in time.
  switch (range) {
    case TimeRange.Hour:
      endDate.setSeconds(0, 0)
      break
    case TimeRange.Day:
    case TimeRange.Week:
      endDate.setMinutes(0, 0, 0)
      break
    default:
      endDate.setHours(0, 0, 0)
  }

  // Floor is redundant since snapping above should clear milliseconds.
  const end = Math.floor(endDate.getTime() / 1000)
  const start = end - rangeDuration[range]

  return {
    start,
    end,
  }
}

/**
 * Get the most recent value at or before the given timestamp.
 *
 * @param data An array of values sorted by timestamp in ascending order.
 * @param timestamp The timestamp to find the value at or before.
 * @returns The most recent value at or before the given timestamp.
 */
export const findValueAtTimestamp = <Value extends { timestamp: number }>(
  data: Value[],
  timestamp: number
): Value | undefined => {
  // Find the most recent value at or before this timestamp. Since they are
  // ascending, get the first one after the timestamp, and then choose the one
  // before.
  const nextIndex = data.findIndex(
    ({ timestamp: dataTimestamp }) => dataTimestamp > timestamp
  )

  // If there is no value after this timestamp, use the last value.
  return nextIndex === -1
    ? data[data.length - 1]
    : // If the first value is after this timestamp, there is no matching item.
      nextIndex === 0
      ? undefined
      : // Otherwise just use the previous value.
        data[nextIndex - 1]
}
