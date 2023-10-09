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

import { Markup } from '@hcengineering/core'
import { Editor } from '@tiptap/core'
import { ChangeSet } from 'prosemirror-changeset'
import { DOMParser, Node, Schema } from 'prosemirror-model'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { recreateTransform } from './recreate'
import { yDocToProsemirrorJSON } from 'y-prosemirror'
import { Doc, applyUpdate } from 'yjs'

/**
 * @public
 */
export function createDocument (schema: Schema, content: Markup | ArrayBuffer, field?: string): Node {
  if (typeof content === 'string') {
    const wrappedValue = `<body>${content}</body>`

    const body = new window.DOMParser().parseFromString(wrappedValue, 'text/html').body

    return DOMParser.fromSchema(schema).parse(body)
  } else {
    try {
      const ydoc = new Doc()
      const uint8arr = new Uint8Array(content)
      applyUpdate(ydoc, uint8arr)

      const body = yDocToProsemirrorJSON(ydoc, field)
      return schema.nodeFromJSON(body)
    } catch (err: any) {
      console.error(err)
      return schema.node(schema.topNodeType)
    }
  }
}

/**
 * @public
 */
export function calculateDecorations (
  editor?: Editor,
  oldContent?: string,
  field?: string,
  comparedVersion?: Markup | ArrayBuffer
):
  | {
    decorations: DecorationSet
    oldContent: string
  }
  | undefined {
  try {
    if (editor === undefined || editor.schema === undefined) {
      return
    }
    if (comparedVersion === undefined) {
      return
    }
    const schema = editor.schema
    const docOld = createDocument(schema, comparedVersion, field)
    const docNew = editor.state.doc

    const c = editor.getHTML()
    if (c === oldContent) {
      return
    }

    const tr = recreateTransform(docOld, docNew)
    const changeSet = ChangeSet.create(docOld).addSteps(tr.doc, tr.mapping.maps, undefined)
    const changes = changeSet.changes

    const decorations: Decoration[] = []

    function lintIcon (color: string): any {
      const icon = document.createElement('div')
      icon.className = `text-editor-lint-icon ${color}`
      return icon
    }

    function deleted (prob: any): any {
      const icon = document.createElement('span')
      icon.className = 'deletion'
      icon.innerText = prob
      return icon
    }
    changes.forEach((change) => {
      if (change.inserted.length > 0) {
        decorations.push(Decoration.inline(change.fromB, change.toB, { class: 'diff insertion' }, {}))
        decorations.push(Decoration.widget(change.fromB, lintIcon('add')))
      }

      if (change.deleted.length > 0) {
        const cont = docOld.textBetween(change.fromA, change.toA)
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
