//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { TiptapTransformer, Transformer } from '@hocuspocus/transformer'
import { Extensions } from '@tiptap/core'
import { generateHTML, generateJSON } from '@tiptap/html'
import { Doc } from 'yjs'

export class HtmlTransformer implements Transformer {
  transformer: Transformer

  constructor (private readonly extensions: Extensions) {
    this.transformer = TiptapTransformer.extensions(extensions)
  }

  fromYdoc (document: Doc, fieldName?: string | string[] | undefined): any {
    const json = this.transformer.fromYdoc(document, fieldName)
    return generateHTML(json, this.extensions)
  }

  toYdoc (document: any, fieldName: string): Doc {
    if (typeof document === 'string' && document !== '') {
      const json = generateJSON(document, this.extensions)
      return this.transformer.toYdoc(json, fieldName)
    }

    return new Doc()
  }
}
