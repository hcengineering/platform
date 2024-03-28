//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { type MarkupNode } from '@hcengineering/text'
import { type Editor } from '@tiptap/core'
import { ChangeSet } from '@tiptap/pm/changeset'
import { type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { deepEqual } from 'fast-equals'
import { yDocToProsemirrorJSON } from 'y-prosemirror'
import { type Doc as Ydoc } from 'yjs'
import { recreateTransform } from './recreate'

/**
 * @public
 */
export function createYdocDocument (schema: Schema, ydoc: Ydoc, field?: string): ProseMirrorNode {
  try {
    const body = yDocToProsemirrorJSON(ydoc, field)
    return schema.nodeFromJSON(body)
  } catch (err: any) {
    console.error(err)
    return schema.node(schema.topNodeType)
  }
}

/**
 * @public
 */
export function calculateDecorations (
  editor?: Editor,
  oldContent?: MarkupNode,
  comparedDoc?: ProseMirrorNode
):
  | {
    decorations: DecorationSet
    oldContent: MarkupNode
  }
  | undefined {
  try {
    if (editor?.schema === undefined) {
      return
    }
    if (comparedDoc === undefined) {
      return
    }
    const docNew = editor.state.doc

    const c = editor.getJSON() as MarkupNode
    if (deepEqual(c, oldContent)) {
      return
    }

    const tr = recreateTransform(comparedDoc, docNew)
    const changeSet = ChangeSet.create(comparedDoc).addSteps(tr.doc, tr.mapping.maps, undefined)
    const changes = changeSet.changes

    const decorations: Decoration[] = []

    function lintIcon (color: string): any {
      const icon = document.createElement('div')
      icon.className = `text-editor-lint-icon ${color}`
      return icon
    }

    function deleted (prob: any): any {
      const icon = document.createElement('span')
      icon.className = 'text-editor-highlighted-node-delete'
      icon.innerText = prob
      return icon
    }
    changes.forEach((change) => {
      if (change.inserted.length > 0) {
        decorations.push(Decoration.inline(change.fromB, change.toB, { class: 'text-editor-highlighted-node-add' }, {}))
        decorations.push(Decoration.widget(change.fromB, lintIcon('add')))
      }

      if (change.deleted.length > 0) {
        const cont = comparedDoc.textBetween(change.fromA, change.toA)
        decorations.push(Decoration.widget(change.fromB, deleted(cont)))
        decorations.push(Decoration.widget(change.fromB, lintIcon('delete')))
      }
    })
    if (decorations.length > 0) {
      return { decorations: DecorationSet.empty.add(docNew, decorations), oldContent: c }
    }
    return { decorations: DecorationSet.empty, oldContent: c }
  } catch (error: any) {
    console.error(error)
  }
}
