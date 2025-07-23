export * from './context'
export * from './metrics'
export * from './types'

/**
 * Return a current performance timestamp
 */
export const platformNow: () => number = () => performance.now()

/**
 * Return a diff with previous performance snapshot with 2 digits after . max.
 */
export const platformNowDiff = (old: number): number => Math.round((performance.now() - old) * 100) / 100
