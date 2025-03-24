//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { ID } from '@hcengineering/communication-types'

export class QueryResult<T> {
  private objectById: Map<ID, T>

  private tail: boolean = false
  private head: boolean = false

  get length(): number {
    return this.objectById.size
  }

  constructor(
    messages: T[],
    private readonly getId: (it: T) => ID
  ) {
    this.objectById = new Map(messages.map((it) => [getId(it), it]))
  }

  isTail(): boolean {
    return this.tail
  }

  isHead(): boolean {
    return this.head
  }

  setHead(head: boolean): void {
    this.head = head
  }

  setTail(tail: boolean): void {
    this.tail = tail
  }

  getResult(): T[] {
    return Array.from(this.objectById.values())
  }

  get(id: ID): Readonly<T> | undefined {
    return this.objectById.get(id)
  }

  delete(id: ID): T | undefined {
    const object = this.objectById.get(id)
    this.objectById.delete(id)
    return object
  }

  deleteAll(): void {
    this.objectById.clear()
  }

  push(object: T): void {
    this.objectById.set(this.getId(object), object)
  }

  unshift(object: T): void {
    this.objectById = new Map([[this.getId(object), object], ...this.objectById])
  }

  pop(): T | undefined {
    const array = Array.from(this.objectById.values())
    const last = array[array.length - 1]
    if (last === undefined) return
    this.objectById.delete(this.getId(last))
    return last
  }

  update(object: T): void {
    this.objectById.set(this.getId(object), object)
  }

  getFirst(): T | undefined {
    return Array.from(this.objectById.values())[0]
  }

  getLast(): T | undefined {
    return Array.from(this.objectById.values())[this.objectById.size - 1]
  }

  prepend(objects: T[]): void {
    const current = Array.from(this.objectById.entries())
    this.objectById = new Map([...objects.map<[ID, T]>((object) => [this.getId(object), object]), ...current])
  }

  append(objects: T[]): void {
    for (const object of objects) {
      this.objectById.set(this.getId(object), object)
    }
  }

  sort(compare: (a: T, b: T) => number): void {
    const current = Array.from(this.objectById.values())
    const sorted = current.sort(compare)
    this.objectById = new Map(sorted.map<[ID, T]>((object) => [this.getId(object), object]))
  }

  copy(): QueryResult<T> {
    const copy = new QueryResult(Array.from(this.objectById.values()), this.getId)

    copy.setHead(this.head)
    copy.setTail(this.tail)
    return copy
  }
}
