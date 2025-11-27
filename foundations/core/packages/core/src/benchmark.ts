import { type Doc, type Domain } from './classes'

/**
 * @public
 */
export const DOMAIN_BENCHMARK = 'benchmark' as Domain

export type BenchmarkDocRange =
  | number
  | {
    // Or random in range
    from: number
    to: number
  }
export interface BenchmarkDoc extends Doc {
  source?: string
  // Query fields to perform different set of workload
  request?: {
    // On response will return a set of BenchmarkDoc with requested fields.
    documents: BenchmarkDocRange

    // A random sized document with size from to sizeTo
    size: BenchmarkDocRange

    // Produce a set of derived documents payload
    derived?: BenchmarkDocRange
  }
  response?: string // A dummy random data to match document's size
}
