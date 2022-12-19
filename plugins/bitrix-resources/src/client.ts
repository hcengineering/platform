import PQueue from 'p-queue'
import { stringify as toQuery } from 'qs'
import { BitrixResult } from './types'

const queue = new PQueue({
  intervalCap: 2,
  interval: 1000
})
export class BitrixClient {
  constructor (readonly url: string) {}

  async call (method: string, params: any): Promise<BitrixResult> {
    return await queue.add(async () => {
      let query: string = toQuery(params)
      if (query.length > 0) {
        query = `?${query}`
      }
      return await (
        await fetch(`${this.url}/${method}${query}`, {
          method: 'get',
          headers: {
            'user-agent': 'anticrm'
          }
        })
      ).json()
    })
  }
}
