//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type MarkupNode } from '@hcengineering/text-core'
import { type HtmlParserOptions, HtmlParser } from './parser'
import { type HtmlSerializerOptions, HtmlSerializer } from './serializer'

export function markupToHtml (markup: MarkupNode, options: HtmlSerializerOptions = {}): string {
  const serializer = new HtmlSerializer(options)
  return serializer.serialize(markup)
}

export function htmlToMarkup (html: string, options: HtmlParserOptions = {}): MarkupNode {
  const parser = new HtmlParser(options)
  return parser.parse(html)
}
