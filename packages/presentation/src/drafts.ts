import { fetchMetadataLocalStorage, setMetadataLocalStorage } from '@hcengineering/ui'
import { deepEqual } from 'fast-equals'
import { Unsubscriber, writable } from 'svelte/store'
import presentation from './plugin'

migrateDrafts()
export const draftsStore = writable<Record<string, any>>(fetchMetadataLocalStorage(presentation.metadata.Draft) ?? {})
let drafts: Record<string, any> = fetchMetadataLocalStorage(presentation.metadata.Draft) ?? {}
const activeDraftsKey = 'activeDrafts'
export const activeDraftsStore = writable<Set<string>>(new Set())
const activeDrafts: Set<string> = new Set()

window.addEventListener('storage', storageHandler)

function storageHandler (evt: StorageEvent): void {
  if (evt.storageArea === localStorage) {
    if (evt.key !== presentation.metadata.Draft) return
    if (evt.newValue !== null) {
      drafts = JSON.parse(evt.newValue)
      draftsStore.set(drafts)
    }
  }
}

function syncDrafts (): void {
  draftsStore.set(drafts)
  setMetadataLocalStorage(presentation.metadata.Draft, drafts)
}

// #region Broadcast

const bc = 'BroadcastChannel' in window ? new BroadcastChannel(activeDraftsKey) : undefined

type BroadcastMessage = BroadcastGetMessage | BroadcastGetResp | BroadcastAddMessage | BroadcastRemoveMessage

interface BroadcastGetMessage {
  type: 'get_all'
}

interface BroadcastGetResp {
  type: 'get_all_response'
  value: string[]
}

interface BroadcastRemoveMessage {
  type: 'remove'
  value: string
}

interface BroadcastAddMessage {
  type: 'add'
  value: string
}

function sendMessage (req: BroadcastMessage): void {
  bc?.postMessage(req)
}

function syncActive (): void {
  activeDraftsStore.set(activeDrafts)
}

function loadActiveDrafts (): void {
  activeDrafts.clear()
  syncActive()
  sendMessage({ type: 'get_all' })
}

if (bc !== undefined) {
  bc.onmessage = (e: MessageEvent<BroadcastMessage>) => {
    if (e.data.type === 'get_all') {
      sendMessage({ type: 'get_all_response', value: Array.from(activeDrafts.values()) })
    }
    if (e.data.type === 'get_all_response') {
      for (const val of e.data.value) {
        activeDrafts.add(val)
      }
      syncActive()
    }
    if (e.data.type === 'add') {
      activeDrafts.add(e.data.value)
      syncActive()
    }
    if (e.data.type === 'remove') {
      activeDrafts.delete(e.data.value)
      syncActive()
    }
  }
}

loadActiveDrafts()

// #endregion

// #region Active

function addActive (id: string): void {
  if (!activeDrafts.has(id)) {
    activeDrafts.add(id)
    syncActive()
    sendMessage({ type: 'add', value: id })
  }
}

function deleteActive (id: string): void {
  if (activeDrafts.has(id)) {
    activeDrafts.delete(id)
    syncActive()
    sendMessage({ type: 'remove', value: id })
  }
}

// #endregion

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

function removeDraft (id: string, parentId: string | undefined = undefined): void {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete drafts[id]
  deleteActive(id)
  syncDrafts()
  if (parentId !== undefined) {
    MultipleDraftController.remove(parentId, id)
  }
}

export class DraftController<T> {
  private unsub: Unsubscriber | undefined = undefined
  constructor (private readonly id: string | undefined, private readonly parentId: string | undefined = undefined) {
    if (this.id !== undefined) {
      addActive(this.id)
    }
  }

  static remove (id: string): void {
    removeDraft(id)
  }

  static save<T>(id: string, object: T, emptyObj: Partial<T> | undefined = undefined): void {
    if (emptyObj !== undefined && isEmptyDraft(object, emptyObj)) {
      return DraftController.remove(id)
    }
    drafts[id] = object
    addActive(id)
    syncDrafts()
  }

  destroy (): void {
    this.unsub?.()
    if (this.id !== undefined) {
      deleteActive(this.id)
    }
  }

  subscribe (callback: (val: T | undefined) => void): Unsubscriber {
    callback(this.get())
    this.unsub = draftsStore.subscribe((p) => {
      callback(this.getValue(p))
    })
    return () => {
      this.destroy()
    }
  }

  private getValue (store: Record<string, any>): T | undefined {
    if (this.id !== undefined) {
      const res = store[this.id]
      return res
    }
  }

  get (): T | undefined {
    return this.getValue(drafts)
  }

  save (object: T, emptyObj: Partial<T> | undefined = undefined): void {
    if (emptyObj !== undefined && isEmptyDraft(object, emptyObj)) {
      return this.remove()
    }
    if (this.id !== undefined) {
      drafts[this.id] = object
      syncDrafts()
      addActive(this.id)
      if (this.parentId !== undefined) {
        MultipleDraftController.add(this.parentId, this.id)
      }
    }
  }

  remove (): void {
    if (this.id !== undefined) {
      removeDraft(this.id, this.parentId)
    }
  }
}

export class MultipleDraftController {
  constructor (private readonly id: string) {}

  static remove (id: string, value: string): void {
    const arr: string[] = drafts[id] ?? []
    const index = arr.findIndex((p) => p === value)
    if (index !== -1) {
      arr.splice(index, 1)
      drafts[id] = arr
      syncDrafts()
    }
  }

  static add (id: string, value: string): void {
    const arr: string[] = drafts[id] ?? []
    if (!arr.includes(value)) {
      arr.push(value)
    }
    drafts[id] = arr
    syncDrafts()
  }

  getNext (): string | undefined {
    const value = drafts[this.id] ?? []
    for (const val of value) {
      if (!activeDrafts.has(val)) {
        return val
      }
    }
  }

  hasNext (callback: (value: boolean) => void): Unsubscriber {
    const next = this.getNext()
    // eslint-disable-next-line
    callback(next !== undefined)
    const draftSub = draftsStore.subscribe((drafts) => {
      const value = drafts[this.id] ?? []
      for (const val of value) {
        if (!activeDrafts.has(val)) {
          // eslint-disable-next-line
          callback(true)
          return
        }
      }
      // eslint-disable-next-line
      callback(false)
    })
    const activeSub = activeDraftsStore.subscribe((activeDrafts) => {
      const value = drafts[this.id] ?? []
      for (const val of value) {
        if (!activeDrafts.has(val)) {
          // eslint-disable-next-line
          callback(true)
          return
        }
      }
      // eslint-disable-next-line
      callback(false)
    })
    return () => {
      draftSub()
      activeSub()
    }
  }
}

function migrateDrafts (): void {
  const drafts = fetchMetadataLocalStorage(presentation.metadata.Draft) ?? {}
  const issues = drafts['tracker:ids:IssueDraft']
  if (!Array.isArray(issues)) {
    drafts['tracker:ids:IssueDraft'] = []
  }
  const candidates = drafts['recruit:mixin:Candidate']
  if (!Array.isArray(candidates)) {
    drafts['recruit:mixin:Candidate'] = []
  }
  setMetadataLocalStorage(presentation.metadata.Draft, drafts)
}
