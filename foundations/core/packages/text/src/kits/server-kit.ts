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

import { NoteBaseExtension } from '../marks/noteBase'
import { QMSInlineCommentMark } from '../marks/qmsInlineCommentMark'

import { EmojiNode } from '../nodes/emoji'
import { FileNode } from '../nodes/file'
import { ImageNode } from '../nodes/image'
import { ReferenceNode } from '../nodes/reference'

import { EmbedNode } from '../nodes/embed'

import { ExtensionFactory, extensionKit } from '../kit'
import { HardBreak } from '../tiptapExtensions'
import { CodeSnippetsKit, CommonKitFactory, ListKit, TableKit, TextColorStylingKit } from './common-kit'

export const ServerKitFactory = (e: ExtensionFactory) =>
  ({
    ...CommonKitFactory(e),

    // ==========================================================================================
    // Extensions and kits with separate / extended implementations in the client-side editor kit
    // See file://./../../../../plugins/text-editor-resources/src/kits/editor-kit.ts
    // =============================================================================

    lists: e(ListKit),
    codeSnippets: e(CodeSnippetsKit),
    tables: e(TableKit),
    textColorStyling: e(TextColorStylingKit),

    hardBreak: e(HardBreak),
    reference: e(ReferenceNode),
    file: e(FileNode),
    image: e(ImageNode),
    embed: e(EmbedNode),
    emoji: e(EmojiNode),

    inlineNote: e(NoteBaseExtension), // Semi-deprecated, should be removed in the future
    qmsInlineCommentMark: e(QMSInlineCommentMark) // Semi-deprecated, should be removed in the future
  }) as const

export const ServerKit = extensionKit('server-kit', ServerKitFactory)
