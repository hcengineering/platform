//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Attachment } from '@anticrm/attachment'
import contact, { Channel, ChannelProvider, EmployeeAccount } from '@anticrm/contact'
import { Ref, TxOperations, WithLookup } from '@anticrm/core'
import attachment from '@anticrm/model-attachment'
import recruit from '@anticrm/model-recruit'
import { Candidate } from '@anticrm/recruit'
import { ReconiDocument } from '@anticrm/rekoni'
import { generateToken } from '@anticrm/server-token'
import { connect } from '@anticrm/server-tool'
import tags, { findTagCategory } from '@anticrm/tags'
import { Client } from 'minio'
import got from 'got'
import { ElasticTool } from './elastic'
import { findOrUpdateAttached } from './utils'
import { readMinioData } from './workspace'

export async function recognize (rekoniUrl: string, data: string, token: string): Promise<ReconiDocument | undefined> {
  const { body }: { body?: ReconiDocument } = await got.post(rekoniUrl + '/recognize?format=pdf', {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    json: {
      fileUrl: 'document.pdf',
      dataBlob: data
    },
    responseType: 'json'
  })
  return body
}

export function isUndef (value?: string): boolean {
  if (value == null || value.trim().length === 0) {
    return true
  }
  return false
}

export async function addChannel (
  client: TxOperations,
  channels: Channel[],
  c: Candidate,
  type: Ref<ChannelProvider>,
  value?: string
): Promise<void> {
  if (value !== undefined) {
    const provider = channels.find((e) => e.provider === type)
    if (provider === undefined) {
      await client.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        c._id,
        contact.class.Person,
        'channels',
        {
          value: value,
          provider: type
        }
      )
    } else {
      if (isUndef(provider.value)) {
        provider.value = value
        await client.update(provider, {
          value: value,
          provider: type
        })
      }
    }
  }
}

export async function updateCandidates (
  transactorUrl: string,
  dbName: string,
  minio: Client,
  mongoUrl: string,
  elasticUrl: string,
  rekoniUrl: string
): Promise<void> {
  const connection = await connect(transactorUrl, dbName)

  const tool = new ElasticTool(mongoUrl, dbName, minio, elasticUrl)
  const done = await tool.connect()

  const token = generateToken('anticrm@hc.engineering', dbName)
  try {
    const client = new TxOperations(connection, 'recruit:account:candidate-importer' as Ref<EmployeeAccount>)

    const candidates = await client.findAll(recruit.mixin.Candidate, {})
    console.log('candidates', candidates.length)
    let cpos = 0
    for (const c of candidates) {
      cpos++
      const attachments = await client.findAll(attachment.class.Attachment, { attachedTo: c._id })
      for (const a of attachments) {
        if (a.type !== 'application/pdf') {
          console.log('skipping', c.name, a.name, `(${cpos}, ${candidates.length})`)
        }
        if (a.type.includes('application/pdf')) {
          console.log('processing', c.name, a.name, `(${cpos}, ${candidates.length})`)
          try {
            const buffer = Buffer.concat(await readMinioData(minio, dbName, a.file)).toString('base64')
            const document = await recognize(rekoniUrl, buffer, token)
            if (document !== undefined) {
              await updateAvatar(c, document, minio, dbName, client, tool)

              // Update candidate values if applicable
              if (isUndef(c.city) && document.city !== undefined) {
                await client.update(c, { city: document.city })
              }

              if (isUndef(c.title) && document.title !== undefined) {
                await client.update(c, { title: document.title })
              }

              // Update contact
              await updateContacts(client, c, document)

              // Update skills
              await updateSkills(client, c, document)
            }
          } catch (err: any) {
            console.error('error processing', err)
          }
        }
      }
    }
  } catch (err: any) {
    console.error(err)
  } finally {
    await done()
    await connection.close()
  }
}

export async function updateSkills (client: TxOperations, c: Candidate, document: ReconiDocument): Promise<void> {
  const skills = await client.findAll(tags.class.TagReference, { attachedTo: c._id })
  const namedSkills = new Set(Array.from(skills.map((it) => it.title.toLowerCase())))

  const elements = await client.findAll(tags.class.TagElement, { targetClass: recruit.mixin.Candidate })
  const namedElements = new Map(Array.from(elements.map((it) => [it.title.toLowerCase(), it._id])))

  const categories = await client.findAll(tags.class.TagCategory, {})

  let pos = 0
  for (const s of document.skills ?? []) {
    const title = s.trim().toLowerCase()
    // Check if we already had skill added
    if (!namedSkills.has(title)) {
      // No yet tag with title
      const color = pos++
      let tag = namedElements.get(title)
      if (tag === undefined) {
        const category = findTagCategory(s, categories)
        tag = await client.createDoc(tags.class.TagElement, tags.space.Tags, {
          title: s,
          color,
          targetClass: recruit.mixin.Candidate,
          description: '',
          category: category
        })
      }
      namedSkills.add(title)
      await client.addCollection(tags.class.TagReference, c.space, c._id, recruit.mixin.Candidate, 'skills', {
        title: title,
        color,
        tag
      })
    }
  }
}
export async function updateContacts (
  client: TxOperations,
  c: WithLookup<Candidate>,
  document: ReconiDocument
): Promise<void> {
  const channels = await client.findAll(contact.class.Channel, { attachedTo: c._id })
  await addChannel(client, channels, c, contact.channelProvider.Email, document.email)
  await addChannel(client, channels, c, contact.channelProvider.GitHub, document.github)
  await addChannel(client, channels, c, contact.channelProvider.LinkedIn, document.linkedin)
  await addChannel(client, channels, c, contact.channelProvider.Phone, document.phone)
  await addChannel(client, channels, c, contact.channelProvider.Telegram, document.telegram)
  await addChannel(client, channels, c, contact.channelProvider.Twitter, document.twitter)
  await addChannel(client, channels, c, contact.channelProvider.Facebook, document.facebook)
}

async function updateAvatar (
  c: WithLookup<Candidate>,
  document: ReconiDocument,
  minio: Client,
  dbName: string,
  client: TxOperations,
  tool: ElasticTool
): Promise<void> {
  if (document.format !== 'headhunter' && document.format !== 'podbor') {
    // Only update avatar for this kind of resume formats.
    return
  }
  if (
    c.avatar === undefined &&
    document.avatar !== undefined &&
    document.avatarName !== undefined &&
    document.avatarFormat !== undefined
  ) {
    const attachId = `${c._id}.${document.avatarName}` as Ref<Attachment>
    // Upload new avatar for candidate
    const data = Buffer.from(document.avatar, 'base64')
    await minio.putObject(dbName, attachId, data, data.length, {
      'Content-Type': document.avatarFormat
    })

    const attachedDoc = await findOrUpdateAttached<Attachment>(
      client,
      recruit.space.CandidatesPublic,
      attachment.class.Photo,
      attachId,
      {
        name: document.avatarName,
        file: attachId,
        type: document.avatarFormat,
        size: data.length,
        lastModified: Date.now()
      },
      {
        attachedTo: c._id,
        attachedClass: contact.class.Person,
        collection: 'photos'
      }
    )

    await tool.indexAttachmentDoc(attachedDoc, data)

    await client.update(c, { avatar: attachId })
  }
}
