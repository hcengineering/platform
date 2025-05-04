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

import { MeasureContext } from '@hcengineering/core'
import { OAuth2Client } from 'google-auth-library'
import { google, people_v1 } from 'googleapis'

import { RateLimiter } from '../rateLimiter'

/**
 * Contact information returned from People API
 */
export interface ContactInfo {
  email: string
  firstName?: string
  lastName?: string
  photoUrl?: string | null
  phoneNumbers?: string[]
  organizations?: Array<{
    name?: string | null
    title?: string | null
  }>
}

/**
 * A client for accessing the Google People API
 */
export class GooglePeopleClient {
  private readonly people: people_v1.Resource$People
  private readonly profileCache = new Map<string, ContactInfo>()

  constructor (
    readonly auth: OAuth2Client,
    readonly ctx: MeasureContext,
    readonly rateLimiter: RateLimiter
  ) {
    this.people = google.people({ version: 'v1', auth }).people
    this.ctx =
      ctx ??
      ({
        info: console.info,
        error: console.error,
        warn: console.warn
      } as any)
  }

  public async getContactInfo (email: string): Promise<ContactInfo | null> {
    if (this.profileCache.has(email)) {
      return this.profileCache.get(email) ?? null
    }

    try {
      await this.rateLimiter.take(1)

      const searchResponse = await this.people.searchContacts({
        query: email,
        readMask: 'names,emailAddresses,photos,organizations,phoneNumbers'
      })

      const results = searchResponse.data.results ?? []
      const person = results.find((result) =>
        result.person?.emailAddresses?.some((e) => e.value?.toLowerCase() === email.toLowerCase())
      )?.person

      if (person == null) {
        // If not found in contacts, try to get basic info from directory
        return await this.getContactFromDirectory(email)
      }

      const names = person.names?.[0]
      const { firstName, lastName } = getFirstAndLastName(names?.displayName, names?.givenName, names?.familyName) ?? {}
      const contactInfo: ContactInfo = {
        email,
        firstName,
        lastName,
        photoUrl: person.photos?.[0]?.url,
        phoneNumbers: person.phoneNumbers?.map((p) => p.value ?? '').filter(Boolean),
        organizations: person.organizations?.map((org) => ({
          name: org.name,
          title: org.title
        }))
      }

      // Cache the result
      this.profileCache.set(email, contactInfo)
      return contactInfo
    } catch (error: any) {
      this.ctx.error('Failed to get contact info from People API', {
        email,
        error: error.message,
        code: error.code
      })
      return null
    }
  }

  /**
   * Get basic contact information from directory
   */
  private async getContactFromDirectory (email: string): Promise<ContactInfo | null> {
    try {
      await this.rateLimiter.take(1)

      const response = await this.people.searchDirectoryPeople({
        query: email,
        readMask: 'names,emailAddresses,photos',
        sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE']
      })

      const person = response.data.people?.find((p) =>
        p.emailAddresses?.some((e) => e.value?.toLowerCase() === email.toLowerCase())
      )

      if (person == null) {
        return null
      }

      const names = person.names?.[0]
      const { firstName, lastName } = getFirstAndLastName(names?.displayName, names?.givenName, names?.familyName) ?? {}
      const contactInfo: ContactInfo = {
        email,
        firstName,
        lastName,
        photoUrl: person.photos?.[0]?.url
      }

      this.profileCache.set(email, contactInfo)
      return contactInfo
    } catch (error: any) {
      this.ctx.error('Failed to get contact from directory', {
        email,
        error: error.message
      })
      return null
    }
  }

  public clearCache (): void {
    this.profileCache.clear()
  }
}

function getFirstAndLastName (
  displayName?: string | null,
  givenName?: string | null,
  familyName?: string | null
): { firstName: string, lastName: string } | undefined {
  if (givenName != null && givenName !== '' && familyName != null && familyName !== '') {
    return { firstName: givenName, lastName: familyName }
  }
  if (displayName == null || displayName === '') return undefined

  // Assume first part is first name
  const parts = displayName.trim().split(/\s+/)
  return parts.length > 1 ? { firstName: parts[0], lastName: parts[1] } : { firstName: displayName, lastName: '' }
}
