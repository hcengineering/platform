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

export interface FoldersState {
  readonly folders: Array<Ref<Doc>>
  readonly folderById: Map<Ref<Doc>, Doc>
  readonly descendants: Map<Ref<Doc>, Doc[]>
}

export function emptyFoldersState (): FoldersState {
  return {
    folders: [],
    folderById: new Map<Ref<Doc>, Doc>(),
    descendants: new Map<Ref<Doc>, Doc[]>()
  }
}

export class FoldersManager {
  titleKey: string
  parentKey: string
  noParentId: Ref<Doc>
  plainList: boolean
  updateStore: (state: FoldersState) => void

  constructor (
    titleKey: string,
    parentKey: string,
    noParentId: Ref<Doc>,
    plainList: boolean,
    updateStore: (state: FoldersState) => void
  ) {
    this.titleKey = titleKey
    this.parentKey = parentKey
    this.noParentId = noParentId
    this.plainList = plainList
    this.updateStore = updateStore
  }

  public getTitle (doc: Doc): string {
    return (doc as any)?.[this.titleKey] ?? ''
  }

  public getParent (doc: Doc): Ref<Doc> {
    return (doc as any)?.[this.parentKey] ?? this.noParentId
  }

  public getDescendants (descendants: Map<Ref<Doc>, Doc[]>, obj: Ref<Doc>): Array<Ref<Doc>> {
    return (descendants.get(obj) ?? [])
      .sort((a, b) => this.getTitle(a).localeCompare(this.getTitle(b)))
      .map((p) => p._id)
  }

  public setFolders (result: Doc[]): void {
    const newState: FoldersState = this.plainList ? this.getPlainList(result) : this.getNestedStructure(result)
    this.updateStore(newState)
  }

  public getNestedStructure (result: Doc[]): FoldersState {
    let folders: Array<Ref<Doc>> = []
    const folderById: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
    const descendants: Map<Ref<Doc>, Doc[]> = new Map<Ref<Doc>, Doc[]>()

    for (const doc of result) {
      const mappedDoc = this.mapDoc(doc)
      const current = descendants.get(this.getParent(mappedDoc)) ?? []
      current.push(mappedDoc)
      descendants.set(this.getParent(mappedDoc), current)
      folderById.set(mappedDoc._id, mappedDoc)
    }

    folders = this.getDescendants(descendants, this.noParentId)
    return { folders, folderById, descendants }
  }

  public getPlainList (result: Doc[]): FoldersState {
    const folderById: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()

    for (const doc of result) {
      const mappedDoc = this.mapDoc(doc)
      folderById.set(mappedDoc._id, mappedDoc)
    }
    const folders: Array<Ref<Doc>> = result.map((doc) => doc._id)

    return {
      folders,
      folderById,
      descendants: new Map<Ref<Doc>, Doc[]>()
    }
  }

  private mapDoc (doc: Doc): Doc {
    const mappedDoc = {
      title: this.getTitle(doc),
      parent: this.getParent(doc),
      ...doc
    }
    return mappedDoc
  }
}
