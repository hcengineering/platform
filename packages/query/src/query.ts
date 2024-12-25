import { Direction, type ID, SortOrder } from '@communication/types'
import { type BroadcastEvent, type QueryCallback, type Client } from '@communication/sdk-types'

import { QueryResult } from './result'
import { defaultQueryParams, type FindParams, type Query, type QueryId } from './types'
import { WindowImpl } from './window'

export class BaseQuery<T, P extends FindParams> implements Query<T, P> {
  protected result: QueryResult<T> | Promise<QueryResult<T>>
  private forward: Promise<T[]> | T[] = []
  private backward: Promise<T[]> | T[] = []

  constructor(
    protected readonly client: Client,
    public readonly id: QueryId,
    public readonly params: P,
    private callback?: QueryCallback<T>,
    initialResult?: QueryResult<T>
  ) {
    if (initialResult !== undefined) {
      this.result = initialResult
      void this.notify()
    } else {
      const limit = this.params.limit ?? defaultQueryParams.limit
      const findParams = {
        ...this.params,
        excluded: this.params.excluded ?? defaultQueryParams.excluded,
        direction: this.params.direction ?? defaultQueryParams.direction,
        sort: this.params.sort ?? defaultQueryParams.sort,
        limit: limit + 1
      }

      const findPromise = this.find(findParams)
      this.result = findPromise.then((res) => {
        const isTail = params.from ? res.length <= limit : params.sort === SortOrder.Desc
        const isHead = params.from === undefined && params.sort === SortOrder.Asc
        if (!isTail) {
          res.pop()
        }
        const qResult = new QueryResult(res, this.getObjectId)
        qResult.setTail(isTail)
        qResult.setHead(isHead)

        return qResult
      })
      this.result
        .then(async () => {
          await this.notify()
        })
        .catch((err: any) => {
          console.error('Failed to update Live query: ', err)
        })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async find(params: FindParams): Promise<T[]> {
    /*Implement in subclass*/
    return [] as T[]
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getObjectId(object: T): ID {
    /*Implement in subclass*/
    return '' as ID
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getObjectDate(object: T): Date {
    /*Implement in subclass*/
    return new Date(0) as Date
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onEvent(event: BroadcastEvent): Promise<void> {
    /*Implement in subclass*/
  }

  setCallback(callback: QueryCallback<T>): void {
    this.callback = callback
    void this.notify()
  }

  removeCallback(): void {
    this.callback = () => {}
  }

  protected async notify(): Promise<void> {
    if (this.callback === undefined) return
    if (this.result instanceof Promise) {
      this.result = await this.result
    }

    const result = this.result.getResult()
    const isTail = this.result.isTail()
    const isHead = this.result.isHead()

    const window = new WindowImpl(result, isTail, isHead, this)
    this.callback(window)
  }

  async loadForward() {
    if (this.result instanceof Promise) {
      this.result = await this.result
    }
    if (this.forward instanceof Promise) {
      this.forward = await this.forward
    }

    if (this.result.isTail()) return

    const last = this.result.getLast()
    if (last === undefined) return

    const limit = this.params.limit ?? defaultQueryParams.limit
    const findParams: FindParams = {
      ...this.params,
      from: this.getObjectDate(last),
      excluded: true,
      direction: Direction.Forward,
      limit: limit + 1,
      sort: SortOrder.Asc
    }

    const forward = this.find(findParams)

    this.forward = forward.then(async (res) => {
      if (this.result instanceof Promise) {
        this.result = await this.result
      }
      const isTail = res.length <= limit
      if (!isTail) {
        res.pop()
      }
      this.result.append(res)
      this.result.setTail(isTail)
      await this.notify()
      return res
    })
  }

  async loadBackward() {
    if (this.result instanceof Promise) {
      this.result = await this.result
    }
    if (this.backward instanceof Promise) {
      this.backward = await this.backward
    }

    if (this.result.isHead()) return

    const first = this.params.sort === SortOrder.Asc ? this.result.getFirst() : this.result.getLast()
    if (first === undefined) return

    const limit = this.params.limit ?? defaultQueryParams.limit
    const findParams: FindParams = {
      ...this.params,
      from: this.getObjectDate(first),
      excluded: true,
      direction: Direction.Backward,
      limit: limit + 1,
      sort: SortOrder.Desc
    }

    const backward = this.find(findParams)
    this.backward = backward.then(async (res) => {
      if (this.result instanceof Promise) {
        this.result = await this.result
      }
      const isHead = res.length <= limit
      if (!isHead) {
        res.pop()
      }

      if (this.params.sort === SortOrder.Asc) {
        const reversed = res.reverse()
        this.result.prepend(reversed)
      } else {
        this.result.append(res)
      }
      this.result.setHead(isHead)
      await this.notify()
      return res
    })
  }

  copyResult(): QueryResult<T> | undefined {
    if (this.result instanceof Promise) {
      return undefined
    }

    return this.result.copy()
  }

  async unsubscribe(): Promise<void> {
    await this.client.unsubscribeQuery(this.id)
  }
}
