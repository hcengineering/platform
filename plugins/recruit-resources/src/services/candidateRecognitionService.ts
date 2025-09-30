// Copyright © 2020 Anticrm Platform Contributors.
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

import { getMetadata } from '@hcengineering/platform'
import { recognizeDocument } from '@hcengineering/rekoni'
import { TagElement, TagReference } from '@hcengineering/tags'
import { CandidateDraft } from '@hcengineering/recruit'
import { getClient } from '@hcengineering/presentation'
import { getColorNumberByText } from '@hcengineering/ui'
import recruit from '../plugin'

export class CandidateRecognitionService {
  private client = getClient()
  private elements = new Map<string, TagElement>()
  private namedElements = new Map<string, TagElement>()
  private newElements: TagElement[] = []

  constructor(private shouldCreateNewSkills: boolean = false) {}

  async recognize(file: File, object: CandidateDraft): Promise<void> {
    const token = getMetadata(presentation.metadata.Token) ?? ''

    try {
      const doc = await recognizeDocument(token, file)

      if (this.isUndef(object.title) && doc.title !== undefined) {
        object.title = doc.title
      }

      if (this.isUndef(object.firstName) && doc.firstName !== undefined) {
        object.firstName = doc.firstName
      }

      if (this.isUndef(object.lastName) && doc.lastName !== undefined) {
        object.lastName = doc.lastName
      }

      if (this.isUndef(object.city) && doc.city !== undefined) {
        object.city = doc.city
      }

      if (!object.avatar && doc.avatar !== undefined) {
        const data = atob(doc.avatar)
        let n = data.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = data.charCodeAt(n)
        }
        object.avatar = new File([u8arr], doc.avatarName ?? 'avatar.png', { type: doc.avatarFormat ?? 'image/png' })
      }

      const newChannels = [...object.channels]
      this.addChannel(newChannels, contact.channelProvider.Email, doc.email)
      this.addChannel(newChannels, contact.channelProvider.GitHub, doc.github)
      this.addChannel(newChannels, contact.channelProvider.LinkedIn, doc.linkedin)
      this.addChannel(newChannels, contact.channelProvider.Phone, doc.phone)
      this.addChannel(newChannels, contact.channelProvider.Telegram, doc.telegram)
      this.addChannel(newChannels, contact.channelProvider.Twitter, doc.twitter)
      this.addChannel(newChannels, contact.channelProvider.Facebook, doc.facebook)
      object.channels = newChannels

      await this.processSkills(doc.skills, object)
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
    }
  }

  private isUndef(value?: string): boolean {
    return value === undefined || value === ''
  }

  private addChannel(channels: AttachedData<Channel>[], type: Ref<ChannelProvider>, value?: string): void {
    if (value !== undefined) {
      const provider = channels.find((e) => e.provider === type)
      if (provider === undefined) {
        channels.push({
          provider: type,
          value
        })
      } else {
        if (this.isUndef(provider.value)) {
          provider.value = value
        }
      }
    }
  }

  private async processSkills(skills: string[], object: CandidateDraft): Promise<void> {
    await this.loadElements()

    const categories = await this.client.findAll(tags.class.TagCategory, { targetClass: recruit.mixin.Candidate })
    const categoriesMap = toIdMap(categories)

    const newSkills: TagReference[] = []
    const formattedSkills = (skills.map((s) => s.toLowerCase()) ?? []).filter(
      (skill) => !this.namedElements.has(skill)
    )
    const refactoredSkills: any[] = []

    if (formattedSkills.length > 0) {
      const existingTags = Array.from(this.namedElements.keys()).filter((x) => x.length > 2)
      const regex = /\S+(?:[-+]\S+)+/g
      const regexForEmpty = /^((?![a-zA-Zа-яА-Я]).)*$/g

      for (let sk of formattedSkills) {
        sk = sk.toLowerCase()
        const toReplace = [...new Set([...existingTags, ...refactoredSkills])]
          .filter((s) => sk.includes(s))
          .sort((a, b) => b.length - a.length)

        if (toReplace.length > 0) {
          for (const replacing of toReplace) {
            if (this.namedElements.has(replacing)) {
              refactoredSkills.push(replacing)
              sk = sk.replace(replacing, '').trim()
            }
          }
        }

        if (sk.includes(' ')) {
          const skSplit = sk.split(' ')
          for (const spl of skSplit) {
            const fixedTitle = regex.test(spl) ? spl.replaceAll(/[+-]/g, '') : spl
            if (this.namedElements.has(fixedTitle)) {
              refactoredSkills.push(fixedTitle)
              sk = sk.replace(spl, '').trim()
            }
            if ([...skills, ...refactoredSkills].includes(fixedTitle)) {
              sk = sk.replace(spl, '').trim()
            }
          }
        }

        if (regex.test(sk)) {
          const fixedTitle = sk.replaceAll(/[+-]/g, '')
          if (this.namedElements.has(fixedTitle)) {
            refactoredSkills.push(fixedTitle)
            sk = ''
          }
        }

        if (!regexForEmpty.test(sk) && !refactoredSkills.includes(sk)) {
          refactoredSkills.push(sk)
        }
      }
    }

    const skillsToAdd = [...new Set([...skills.map((s) => s.toLowerCase()), ...refactoredSkills])]

    for (const s of skillsToAdd) {
      const title = s.trim().toLowerCase()
      let e = this.namedElements.get(title)
      if (e === undefined && this.shouldCreateNewSkills) {
        const category = findTagCategory(s, categories)
        const cinstance = categoriesMap.get(category)
        e = TxProcessor.createDoc2Doc(
          this.client.txFactory.createTxCreateDoc(tags.class.TagElement, core.space.Workspace, {
            title,
            description: `Imported skill ${s} of ${cinstance?.label ?? ''}`,
            color: getColorNumberByText(s),
            targetClass: recruit.mixin.Candidate,
            category
          })
        )
        this.namedElements.set(title, e)
        this.elements.set(e._id, e)
        this.newElements.push(e)
      }
      if (e !== undefined) {
        newSkills.push(
          TxProcessor.createDoc2Doc(
            this.client.txFactory.createTxCreateDoc(tags.class.TagReference, core.space.Workspace, {
              title: e.title,
              color: e.color,
              tag: e._id,
              attachedTo: '' as Ref<Doc>,
              attachedToClass: recruit.mixin.Candidate,
              collection: 'skills'
            })
          )
        )
      }
    }

    object.skills = [...object.skills, ...newSkills]
  }

  private async loadElements(): Promise<void> {
    const elementQuery = createQuery()
    await new Promise<void>((resolve) => {
      elementQuery.query(
        tags.class.TagElement,
        {
          targetClass: recruit.mixin.Candidate
        },
        (result) => {
          const ne = new Map<Ref<TagElement>, TagElement>()
          const nne = new Map<string, TagElement>()
          for (const t of this.newElements.concat(result)) {
            ne.set(t._id, t)
            nne.set(t.title.trim().toLowerCase(), t)
          }
          this.elements = ne
          this.namedElements = nne
          resolve()
        }
      )
    })
  }
} 