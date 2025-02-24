//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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

import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { CellSelection } from '@tiptap/pm/tables'

export interface TableNodeLocation {
  pos: number
  start: number
  node: ProseMirrorNode
}

// This subclass serves as a tag to distinguish between situations where
// the table is selected as a node and when all cells in the table are selected,
// the deletion behavior depends on this.
export class TableSelection extends CellSelection {}
