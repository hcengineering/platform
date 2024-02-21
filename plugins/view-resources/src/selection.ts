import { type Doc, type Ref } from '@hcengineering/core'
import { panelstore } from '@hcengineering/ui'
import { onDestroy } from 'svelte'
import { type Unsubscriber, type Writable, writable } from 'svelte/store'

/**
 * @public
 *
 */
export type SelectDirection = 'vertical' | 'horizontal'

// Default selection limit
export const selectionLimit = 200

export interface SelectionFocusProvider {
  // -1 - previous
  // 0 - selec of as current
  // 1 - next
  // * If vertical, next will return item under.
  // * If horizontal, next will return item on right.
  // of - document offset from we requesting.
  select?: (offset: 1 | -1 | 0, of?: Doc, direction?: SelectDirection, noScroll?: boolean) => void

  // Update documents content
  update: (docs: Doc[]) => void

  // Return selection index from list of documents.
  current: (doc?: FocusSelection) => number | undefined

  // Update focused element, selection is not changed.
  updateFocus: (doc: Doc) => void

  // Update curent selection list, focus items it not updated.
  updateSelection: (docs: Doc[], value: boolean) => void

  // Return all selectable documents
  docs: () => Doc[]

  // All selected documents
  selection: Writable<Doc[]>
}

/**
 * @public
 *
 * Define document selection inside platform.
 */
export interface FocusSelection {
  // Focused document
  focus?: Doc

  // Additional interface to select, next/prev etc.
  provider?: SelectionFocusProvider
}

/**
 * @public
 *
 * Define document selection inside platform.
 */
export interface SelectionStore {
  // Selected documents
  docs: Doc[]
  // Provider where documents are selected
  provider?: SelectionFocusProvider
}

/**
 * @public
 */
export const focusStore = writable<FocusSelection>({})

/**
 * @public
 */
export const selectionStore = writable<SelectionStore>({ docs: [] })

/**
 * @public
 */
export const previewDocument = writable<Doc | undefined>()

panelstore.subscribe((val) => {
  previewDocument.set(undefined)
})

/**
 * @public
 */
export function updateFocus (selection?: FocusSelection): void {
  if (!window.document.hasFocus()) {
    window.focus()
  }

  focusStore.update((cur) => {
    const now = Date.now()

    cur.focus = selection?.focus
    cur.provider = selection?.provider
    ;(cur as any).now = now
    previewDocument.update((old) => {
      if (old !== undefined) {
        return selection?.focus
      }
    })

    return cur
  })
}

interface ProviderSelection {
  docs: Doc[]
  provider: ListSelectionProvider
}

const providers: ProviderSelection[] = []

function updateSelection (selection: ProviderSelection): void {
  const index = providers.findIndex((p) => p.provider === selection.provider)
  if (index !== -1) {
    providers[index] = selection
  }

  selectionStore.set(selection)
}

/**
 * @public
 *
 * List selection provider
 */
export class ListSelectionProvider implements SelectionFocusProvider {
  private _docs: Doc[] = []
  _current?: FocusSelection
  selection: Writable<Doc[]> = writable([])
  private readonly unsubscribe: Unsubscriber[]

  constructor (
    private readonly delegate: (offset: 1 | -1 | 0, of?: Doc, direction?: SelectDirection, noScroll?: boolean) => void,
    autoDestroy = true
  ) {
    this.unsubscribe = [
      // keep track of current focus
      focusStore.subscribe((focus) => {
        this._current = focus
      }),
      // update global selection when current changes
      this.selection.subscribe((docs) => {
        updateSelection({ docs, provider: this })
      })
    ]

    providers.push({ docs: [], provider: this })
    selectionStore.set({ docs: [], provider: this })

    if (autoDestroy) {
      onDestroy(() => {
        this.destroy()
      })
    }
  }

  static Find (_id: Ref<Doc>): ListSelectionProvider | undefined {
    for (const { provider } of providers) {
      if (provider !== undefined) {
        if (provider.docs().findIndex((p) => p._id === _id) !== -1) {
          return provider
        }
      }
    }
  }

  static Pop (): void {
    if (providers.length === 0) return
    const last = providers[providers.length - 1]
    last.provider.destroy()
  }

  destroy (): void {
    const thisIndex = providers.findIndex((p) => p.provider === this)
    providers.splice(thisIndex, 1)

    // switch selection to the last provider if lost selection
    if (thisIndex === providers.length) {
      if (providers.length > 0) {
        const next = providers[providers.length - 1].provider
        const index = next.current()
        const target = index !== undefined ? next.docs()[index] : undefined
        updateFocus({ focus: target, provider: next })
      } else {
        updateFocus()
      }
    }

    // switch selection to the last provider if lost selection
    selectionStore.update((selection) => {
      if (selection.provider === this) {
        const next = providers[providers.length - 1]
        return next ?? { docs: selection.docs }
      }
      return selection
    })

    this.unsubscribe.forEach((p) => {
      p()
    })
  }

  select (offset: 1 | -1 | 0, of?: Doc, direction?: SelectDirection, noScroll?: boolean): void {
    this.delegate(offset, of, direction, noScroll)
  }

  // this is the main method that is called when docs are updated
  update (docs: Doc[]): void {
    this._docs = docs

    // remove missing documents from selection
    this.selection.update((docs) => {
      const ids = new Set(docs.map((it) => it._id))
      return this._docs.filter((it) => ids.has(it._id))
    })

    if (this._docs.length > 0) {
      if (this._current === undefined) {
        this.delegate(0, undefined, 'vertical')
      } else {
        // Check if we don't have object, we need to select first one.
        this.delegate(0, this._current?.focus, 'vertical', true)
      }
      // focus current provider if nothing focused
      if (this._current?.focus === undefined) {
        updateFocus({ focus: this._current?.focus, provider: this })
      }
    }
  }

  docs (): Doc[] {
    return this._docs
  }

  updateFocus (doc: Doc): void {
    updateFocus({ focus: doc, provider: this })
  }

  updateSelection (docs: Doc[], value: boolean): void {
    this.selection.update((selection) => {
      const docsSet = new Set(docs.map((it) => it._id))
      const noDocs = selection.filter((it) => !docsSet.has(it._id))
      return value ? [...noDocs, ...docs] : noDocs
    })
  }

  current (doc?: FocusSelection): number | undefined {
    const index = this._docs.findIndex((it) => it._id === (doc?.focus?._id ?? this._current?.focus?._id))
    return index === -1 ? undefined : index
  }
}
