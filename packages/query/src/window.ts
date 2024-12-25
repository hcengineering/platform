import type { Window } from '@communication/types'

import type { Query } from './types'

export class WindowImpl<T> implements Window<T> {
  constructor(
    private readonly result: T[],
    private readonly isTail: boolean,
    private readonly isHead: boolean,
    private readonly query: Query<T>
  ) {}

  getResult(): T[] {
    return this.result
  }

  async loadNextPage(): Promise<void> {
    if (!this.hasNextPage()) return
    await this.query.loadForward()
  }

  async loadPrevPage(): Promise<void> {
    if (!this.hasPrevPage()) return
    await this.query.loadBackward()
  }

  hasNextPage(): boolean {
    return !this.isTail
  }

  hasPrevPage(): boolean {
    return !this.isHead
  }
}
