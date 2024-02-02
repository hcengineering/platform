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

import { Account, Ref, Timestamp } from './classes'

/**
 * TODO
 * 1. tiptap field value
 *   1. hardcode like in wiki or use dynamic and store somewhere ?
 *   2. how to deal with multi-field douments ?
 * 2. collaborative doc id
 *   1. Should it be the same for snapshots ?
 * 3. How do we pass history id to the collaborator ? Probably we don't need to
 */

/**
 * Collaborative document structure
 *
 * WIKI
 * {
 *   '': Y.XmlFragment( ... prosemirror document content ... )
 * }
 *
 * QMS
 * {
 *   section1: Y.XmlFragment( ... prosemirror document content ... ),
 *   section2: Y.XmlFragment( ... prosemirror document content ... ),
 *   ...
 * }
 *
 * Other (description name depends on the attribute name)
 * {
 *   description: Y.XmlFragment( ... prosemirror document content ... )
 * }
*/

/**
 * Collaborative history document structure
 *
 * {
 *   history: Y.Array[
 *     { ... YDoc snapshot ... },
 *     { ... YDoc snapshot ... },
 *     { ... YDoc snapshot ... },
 *     ...
 *   ]
 * }
*/

// TODO add some descriptor to the original doc hidden section the same as CollaborativeDocWithHistory.history?

/**
 * Identifier of the collaborative document holding collaborative content
 * @public
 * */
export type CollaborativeDocId = string & { __collaborativeDocId: true }

/**
 * Identifier of the collaborative document holding collaborative document history
 * @public
 * */
export type CollaborativeDocVersionId = string & { __collaborativeDocVersionId: true }

/** @public */
export enum CollaborativeDocVersionKind {
  Automatic,
  Manual
}

/** @public */
export interface CollaborativeDoc {
  collaborativeId: CollaborativeDocId
}

/** @public */
export interface CollaborativeDocVersion {
  // human readable version name
  name: string

  version: number
  versionId: CollaborativeDocVersionId
  kind: CollaborativeDocVersionKind

  createdBy: Ref<Account>
  createdOn: Timestamp
}

/** @public */
export interface CollaborativeDocWithHistory extends CollaborativeDoc {
  historyId: CollaborativeDocId
  version: number
  history: CollaborativeDocVersion[]
}
