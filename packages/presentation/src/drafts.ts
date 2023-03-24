import { fetchMetadataLocalStorage, setMetadataLocalStorage } from '@hcengineering/ui'
import { deepEqual } from 'fast-equals'
import { get, writable } from 'svelte/store'
import presentation from './plugin'

export const draftsStore = writable<Record<string, any>>(fetchMetadataLocalStorage(presentation.metadata.Draft) ?? {})
window.addEventListener('storage', storageHandler)
const saveInterval = 200

function storageHandler (evt: StorageEvent): void {
  if (evt.storageArea !== localStorage) return
  if (evt.key !== presentation.metadata.Draft) return
  if (evt.newValue !== null) {
    draftsStore.set(JSON.parse(evt.newValue))
  }
}

function isEmptyDraft<T> (object: T, emptyObj: Partial<T> | undefined): boolean {
  for (const key in object) {
    if (key === '_id') continue
    const value = object[key]
    let res: boolean = false
    if (Array.isArray(value)) {
      res = value.length > 0
      if (res && emptyObj != null) {
        res = !deepEqual(value, emptyObj[key])
      }
    } else {
      res = value != null
      if (res && typeof value === 'string') {
        res = value.trim() !== ''
      }
      if (res && typeof value === 'number') {
        res = value !== 0
      }
      if (res && emptyObj != null) {
        res = !deepEqual(value, emptyObj[key])
      }
    }
    if (res) {
      return false
    }
  }
  return true
}

export class DraftController<T> {
  private timer: number | undefined = undefined
  constructor (private readonly id: string) {}

  static remove (id: string): void {
    const drafts = get(draftsStore)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete drafts[id]
    draftsStore.set(drafts)
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
  }

  static save<T>(id: string, object: T, emptyObj: Partial<T> | undefined = undefined): void {
    const drafts = get(draftsStore)
    if (emptyObj !== undefined && isEmptyDraft(object, emptyObj)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete drafts[id]
    } else {
      drafts[id] = object
    }
    draftsStore.set(drafts)
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
  }

  get (): T | undefined {
    const drafts = get(draftsStore)
    const res = drafts[this.id]
    return res
  }

  save (object: T, emptyObj: Partial<T> | undefined = undefined): void {
    const drafts = get(draftsStore)
    if (emptyObj !== undefined && isEmptyDraft(object, emptyObj)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete drafts[this.id]
    } else {
      drafts[this.id] = object
    }
    draftsStore.set(drafts)
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
  }

  private update (object: T, emptyObj: Partial<T> | undefined): void {
    this.timer = window.setTimeout(() => {
      this.save(object, emptyObj)
      this.update(object, emptyObj)
    }, saveInterval)
  }

  unsubscribe (): void {
    if (this?.timer !== undefined) {
      clearTimeout(this.timer)
    }
  }

  watch (object: T, emptyObj: Partial<T> | undefined = undefined): void {
    this.unsubscribe()
    this.save(object, emptyObj)
    this.update(object, emptyObj)
  }

  remove (): void {
    this.unsubscribe()
    const drafts = get(draftsStore)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete drafts[this.id]
    setMetadataLocalStorage(presentation.metadata.Draft, drafts)
    draftsStore.set(drafts)
  }
}
