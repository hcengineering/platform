import {
  resultSort,
  WithLookup,
  type Class,
  type Doc,
  type Hierarchy,
  type MemDb,
  type Ref,
  type SortingQuery
} from '@hcengineering/core'

export class ResultArray {
  private docs: Map<Ref<Doc>, WithLookup<Doc>>

  private readonly clones = new Map<string, Map<Ref<Doc>, WithLookup<Doc>>>()

  get length (): number {
    return this.docs.size
  }

  constructor (
    docs: Doc[],
    readonly hierarchy: Hierarchy
  ) {
    this.docs = new Map(docs.map((it) => [it._id, it]))
  }

  clean (): void {
    this.clones.clear()
  }

  getDocs (): WithLookup<Doc>[] {
    return Array.from(this.docs.values())
  }

  findDoc (_id: Ref<Doc>): WithLookup<Doc> | undefined {
    return this.docs.get(_id)
  }

  getClone<T extends Doc>(): T[] {
    return this.hierarchy.clone(this.getDocs())
  }

  getResult (id: string): Doc[] {
    // Lets form a new list based on clones we have already.
    const info = this.clones.get(id)
    if (info === undefined) {
      const docs = this.getClone()
      this.clones.set(id, new Map(docs.map((it) => [it._id, it])))
      return docs
    } else {
      return Array.from(info.values())
    }
  }

  delete (_id: Ref<Doc>): Doc | undefined {
    const doc = this.docs.get(_id)
    this.docs.delete(_id)
    for (const [, v] of this.clones.entries()) {
      v.delete(_id)
    }
    return doc
  }

  updateDoc (doc: WithLookup<Doc>, mainClone = true): void {
    this.docs.set(doc._id, mainClone ? this.hierarchy.clone(doc) : doc)
    for (const [, v] of this.clones.entries()) {
      v.set(doc._id, this.hierarchy.clone(doc))
    }
  }

  push (doc: WithLookup<Doc>): void {
    this.docs.set(doc._id, this.hierarchy.clone(doc))
    for (const [, v] of this.clones.entries()) {
      v.set(doc._id, this.hierarchy.clone(doc))
    }
    // this.changes.add(doc._id)
  }

  pop (): WithLookup<Doc> | undefined {
    const lastElement = Array.from(this.docs)[this.docs.size - 1]
    if (lastElement !== undefined) {
      this.docs.delete(lastElement[0])
      for (const [, v] of this.clones.entries()) {
        v.delete(lastElement[0])
      }
      return lastElement[1]
    }
    return undefined
  }

  sort<T extends Doc>(_class: Ref<Class<Doc>>, sort: SortingQuery<T>, hierarchy: Hierarchy, memdb: MemDb): void {
    const docs = Array.from(this.docs.values())
    resultSort(docs, sort, _class, hierarchy, memdb)
    this.docs = new Map(docs.map((it) => [it._id, it]))
    for (const [k, v] of this.clones.entries()) {
      this.clones.set(k, new Map(docs.map((it) => [it._id, v.get(it._id) ?? this.hierarchy.clone(it)])))
    }
  }
}
