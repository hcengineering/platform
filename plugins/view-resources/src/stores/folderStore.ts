// Copyright © 2024 Hardcore Engineering Inc.
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

import { type Doc, type Ref } from '@hcengineering/core'
import { writable, type Writable } from 'svelte/store'

export class FoldersState {
  folders: Array<Ref<Doc>>
  folderById: Map<Ref<Doc>, Doc>
  descendants: Map<Ref<Doc> | null, Doc[]>

  constructor (folders: Array<Ref<Doc>>, folderById: Map<Ref<Doc>, Doc>, descendants: Map<Ref<Doc> | null, Doc[]>) {
    this.folders = folders
    this.folderById = folderById
    this.descendants = descendants
  }

  static empty (): FoldersState {
    return new FoldersState([], new Map<Ref<Doc>, Doc>(), new Map<Ref<Doc>, Doc[]>())
  }
}

export const FoldersStore: Writable<FoldersState> = writable(FoldersState.empty())

export const SelectedFolderStore: Writable<Ref<Doc> | undefined> = writable(undefined)

export function setSelectedFolder (_id: Ref<Doc> | undefined): void {
  SelectedFolderStore.set(_id)
}

export class FoldersManager {
  titleKey: string
  parentKey: string

  constructor (titleKey: string, parentKey: string) {
    this.titleKey = titleKey
    this.parentKey = parentKey
  }

  public getTitle (doc: Doc): string {
    return (doc as any)?.[this.titleKey] ?? ''
  }

  public getParent (doc: Doc): Ref<Doc> | null {
    return (doc as any)?.[this.parentKey] ?? null
  }

  public getDescendants (descendants: Map<Ref<Doc> | null, Doc[]>, obj: Ref<Doc> | null): Array<Ref<Doc>> {
    return (descendants.get(obj) ?? [])
      .sort((a, b) => this.getTitle(a).localeCompare(this.getTitle(b)))
      .map((p) => p._id)
  }

  public setFolders (result: Doc[]): void {
    let folders: Array<Ref<Doc>> = []
    const folderById: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
    const descendants: Map<Ref<Doc> | null, Doc[]> = new Map<Ref<Doc>, Doc[]>()

    for (const doc of result) {
      const current = descendants.get(this.getParent(doc)) ?? []
      current.push(doc)
      descendants.set(this.getParent(doc), current)
      folderById.set(doc._id, doc)
    }

    folders = this.getDescendants(descendants, null)
    FoldersStore.set(new FoldersState(folders, folderById, descendants))
  }
}
