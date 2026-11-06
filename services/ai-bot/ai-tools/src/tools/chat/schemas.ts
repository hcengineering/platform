//
// Copyright © 2026 TraceX SAS.
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

import { Type, type Static } from 'typebox'
import { ClassSummarySchema, DocumentReferenceSchema } from '../shared'

export const ChatTypeSchema = Type.Enum(['channel', 'direct', 'discussion', 'thread'], {
  description: 'Readable stream type. A thread is identified by its root message document.'
})

export const ChatTargetSchema = Type.With(DocumentReferenceSchema, {
  description:
    'Message stream address from tool results: a channel, direct, discussion, or root chat message for a thread. Arbitrary document comments are excluded.'
})

export const ChatLimitSchema = Type.Optional(
  Type.Number({
    minimum: 1,
    maximum: 200,
    multipleOf: 1,
    default: 50,
    description: 'Maximum number of results. Defaults to 50, maximum 200.'
  })
)

export const ChatPageProperties = {
  hasMore: Type.Boolean({ description: 'Whether another page can be requested.' }),
  nextCursor: Type.Optional(
    Type.String({ description: 'Pass this cursor unchanged with the same target and filters to continue.' })
  )
}

export const ChatSummarySchema = Type.Object(
  {
    target: ChatTargetSchema,
    type: ChatTypeSchema,
    name: Type.String({ description: 'Chat name, direct participant names, or thread root preview.' }),
    spaceId: Type.String(),
    members: Type.Optional(
      Type.Array(
        Type.String({ description: 'Explicit member account id; discussion access may follow additional policies.' })
      )
    ),
    resolved: Type.Optional(Type.Boolean({ description: 'Whether a discussion has been resolved.' })),
    parent: Type.Optional(
      Type.With(DocumentReferenceSchema, {
        description:
          'Containing chat for a thread, or owner document for a discussion. Context only; use target for operations.'
      })
    ),
    parentTitle: Type.Optional(
      Type.String({
        description: 'Readable title of the containing chat for a thread, or the owner document for a discussion.'
      })
    ),
    linkedTo: Type.Optional(
      Type.With(DocumentReferenceSchema, {
        description:
          'Optional document the discussion is specifically about, such as an attachment belonging to its owner.'
      })
    )
  },
  {
    description: 'A message stream with a stable target, readable type and name, and optional parent context.'
  }
)

export const ChatMessageSchema = Type.Object(
  {
    id: Type.String({
      description: 'Message id. For a root message, combine class.id and id as a thread target.'
    }),
    class: ClassSummarySchema,
    author: Type.Object({
      id: Type.String({ description: 'Author social identity id.' }),
      personId: Type.Optional(Type.String()),
      name: Type.Optional(Type.String())
    }),
    date: Type.Number({ description: 'Creation timestamp in milliseconds since Unix epoch.' }),
    editedOn: Type.Optional(Type.Number()),
    content: Type.String({ description: 'Chat message as Markdown.' }),
    replies: Type.Number({
      description: 'Reply count. A root message can be used as a thread target even before the first reply.'
    }),
    attachments: Type.Array(
      Type.Object({
        id: Type.String(),
        name: Type.String(),
        blobId: Type.String(),
        size: Type.Number(),
        type: Type.String(),
        url: Type.Optional(Type.String({ description: 'Storage-provided download URL, when available; may expire.' }))
      })
    )
  },
  { description: 'A message in the chat or thread identified by the enclosing response.' }
)

export type ChatType = Static<typeof ChatTypeSchema>
export type ChatSummary = Static<typeof ChatSummarySchema>
export type ChatMessageOutput = Static<typeof ChatMessageSchema>
