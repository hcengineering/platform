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

import { type CollaborativeDoc, type Doc, type Ref } from '@hcengineering/core'

/** @public */
export type MarkupRef = CollaborativeDoc

/** @public */
export type MarkupFormat = 'markup' | 'html' | 'markdown'

/** @public */
export class MarkupContent {
  constructor (
    readonly content: string,
    readonly kind: MarkupFormat
  ) {}
}

/** @public */
export function html (content: string): MarkupContent {
  return new MarkupContent(content, 'html')
}

/** @public */
export function markdown (content: string): MarkupContent {
  return new MarkupContent(content, 'markdown')
}

/**
 * Provides operations for managing markup (rich-text) content.
 * @public */
export interface MarkupOperations {
  /**
   * Retrieves markup content for a specified document object
   * @param objectId - Reference to the document containing the markup
   * @param objectAttr - The attribute/field name where the markup is stored
   * @param id - Unique reference identifying the specific markup content
   * @param format - The format of the markup (e.g., HTML, Markdown, etc.)
   * @returns Promise containing the markup content as a string
   */
  fetchMarkup: (objectId: Ref<Doc>, objectAttr: string, id: MarkupRef, format: MarkupFormat) => Promise<string>

  /**
   * Saves markup content for a document object
   * @param objectId - Reference to the document where markup should be stored
   * @param objectAttr - The attribute/field name where markup should be saved
   * @param markup - The actual markup content to be uploaded
   * @param format - The format of the provided markup (e.g., HTML, Markdown, etc.)
   * @returns Promise containing a reference to the newly saved markup
   */
  uploadMarkup: (objectId: Ref<Doc>, objectAttr: string, markup: string, format: MarkupFormat) => Promise<MarkupRef>
}
