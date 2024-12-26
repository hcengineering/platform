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

  setHead(head: boolean) {
    this.head = head
  }

  setTail(tail: boolean) {
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

  deleteAll() {
    this.objectById.clear()
  }

  push(object: T): void {
    this.objectById.set(this.getId(object), object)
  }

  unshift(object: T): void {
    this.objectById = new Map([[this.getId(object), object], ...this.objectById])
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

  prepend(objects: T[]) {
    const current = Array.from(this.objectById.entries())
    this.objectById = new Map([...objects.map<[ID, T]>((object) => [this.getId(object), object]), ...current])
  }

  append(objects: T[]) {
    for (const object of objects) {
      this.objectById.set(this.getId(object), object)
    }
  }

  copy(): QueryResult<T> {
    const copy = new QueryResult(Array.from(this.objectById.values()), this.getId)

    copy.setHead(this.head)
    copy.setTail(this.tail)
    return copy
  }
}
