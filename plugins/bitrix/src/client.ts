import { stringify as toQuery } from 'qs'
import { BitrixResult } from './types'

/**
 * @public
 *
 * Require a proper rate limiter to function properly.
 */
export class BitrixClient {
  constructor (readonly url: string, readonly rateLimiter: <T>(op: () => Promise<T>) => Promise<T>) {}

  async call (method: string, params: any): Promise<BitrixResult> {
    return await this.rateLimiter(async () => {
      let query: string = toQuery(params)
      if (query.length > 0) {
        query = `?${query}`
      }
      return await (
        await fetch(`${this.url}/${method}${query}`, {
          method: 'get',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      ).json()
    })
  }
}
