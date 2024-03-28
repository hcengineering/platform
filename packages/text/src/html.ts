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

import { Extensions, getSchema } from '@tiptap/core'
import { generateJSON, generateHTML } from '@tiptap/html'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

import { ServerKit } from './kits/server-kit'

const defaultExtensions = [ServerKit]

/** @public */
export function getHTML (node: ProseMirrorNode, extensions?: Extensions): string {
  extensions = extensions ?? defaultExtensions
  return generateHTML(node.toJSON(), extensions)
}

/** @public */
export function parseHTML (content: string, extensions?: Extensions): ProseMirrorNode {
  extensions = extensions ?? defaultExtensions

  const schema = getSchema(extensions)
  const json = generateJSON(content, extensions)

  return ProseMirrorNode.fromJSON(schema, json)
}
