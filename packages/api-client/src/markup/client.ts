//
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
//

import { type Doc, Markup, type Ref, concatLink, makeCollaborativeDoc } from '@hcengineering/core'
import { type CollaboratorClient, getClient } from '@hcengineering/collaborator-client'
import { parseMessageMarkdown, jsonToMarkup, markupToHTML, markupToMarkdown, htmlToMarkup } from '@hcengineering/text'

import { type ServerConfig } from '../config'
import { type MarkupOperations, type MarkupFormat, type MarkupRef } from './types'

export function createMarkupOperations (
  url: string,
  workspace: string,
  token: string,
  config: ServerConfig
): MarkupOperations {
  return new MarkupOperationsImpl(url, workspace, token, config)
}

class MarkupOperationsImpl implements MarkupOperations {
  private readonly collaborator: CollaboratorClient
  private readonly imageUrl: string
  private readonly refUrl: string

  constructor (
    private readonly url: string,
    private readonly workspace: string,
    private readonly token: string,
    private readonly config: ServerConfig
  ) {
    this.refUrl = concatLink(this.url, `/browse?workspace=${workspace}`)
    this.imageUrl = concatLink(this.url, `/files?workspace=${workspace}&file=`)
    this.collaborator = getClient({ name: workspace }, token, config.COLLABORATOR_URL)
  }

  async fetchMarkup (objectId: Ref<Doc>, objectAttr: string, doc: MarkupRef, format: MarkupFormat): Promise<string> {
    const content = await this.collaborator.getContent(doc)
    const markup = content[objectAttr] ?? ''

    switch (format) {
      case 'markup':
        return markup
      case 'html':
        return markupToHTML(markup)
      case 'markdown':
        return await markupToMarkdown(markup, this.refUrl, this.imageUrl)
      default:
        throw new Error('Unknown content format')
    }
  }

  async uploadMarkup (objectId: Ref<Doc>, objectAttr: string, value: string, format: MarkupFormat): Promise<MarkupRef> {
    let markup: Markup = ''

    switch (format) {
      case 'markup':
        markup = value
        break
      case 'html':
        markup = htmlToMarkup(value)
        break
      case 'markdown':
        markup = jsonToMarkup(parseMessageMarkdown(value, this.imageUrl, this.refUrl))
        break
      default:
        throw new Error('Unknown content format')
    }

    const doc = makeCollaborativeDoc(objectId, objectAttr)
    await this.collaborator.updateContent(doc, { [objectAttr]: markup })
    return doc
  }
}
