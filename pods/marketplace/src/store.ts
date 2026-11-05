// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { AccountUuid } from '@hcengineering/core'
import {
  compareDefinitionPackageVersions,
  type CatalogPackage,
  type CatalogPackageIdentity,
  type CatalogPackageVisibility,
  type CatalogPage,
  type CatalogRelease
} from '@hcengineering/marketplace'
import postgres from 'postgres'
import { CatalogError } from './errors'

export interface CatalogPublication extends Omit<CatalogPackage, 'visibility'> {
  visibility?: CatalogPackageVisibility
  contentHash: string
  source: string
}

export interface CatalogListOptions {
  viewer: AccountUuid
  search: string
  author?: AccountUuid
  offset: number
  limit: number
}

export interface CatalogStore {
  list: (options: CatalogListOptions) => Promise<CatalogPage<CatalogPackage>>
  get: (identity: CatalogPackageIdentity, viewer: AccountUuid) => Promise<CatalogPackage>
  setVisibility: (
    identity: CatalogPackageIdentity,
    viewer: AccountUuid,
    visibility: CatalogPackageVisibility
  ) => Promise<void>
  releases: (identity: CatalogPackageIdentity, viewer: AccountUuid, offset: number) => Promise<CatalogPage<CatalogRelease>>
  download: (identity: CatalogPackageIdentity, viewer: AccountUuid, version?: string) => Promise<string>
  publish: (publication: CatalogPublication) => Promise<CatalogRelease>
}

/** Owns only the marketplace schema; account and workspace storage are independent. */
export class PostgresCatalogStore implements CatalogStore {
  private readonly sql: postgres.Sql

  constructor (url: string) {
    this.sql = postgres(url, { max: 10 })
  }

  async init (): Promise<void> {
    await this.sql`CREATE SCHEMA IF NOT EXISTS marketplace`
    await this.sql`CREATE TABLE IF NOT EXISTS marketplace.packages (
      author UUID NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('card', 'process')),
      latest_version TEXT NOT NULL,
      author_name TEXT NOT NULL,
      contact_email TEXT,
      published_on DOUBLE PRECISION NOT NULL,
      PRIMARY KEY (author, id)
    )`
    await this.sql`ALTER TABLE marketplace.packages
      ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private'))`
    await this.sql`CREATE TABLE IF NOT EXISTS marketplace.releases (
      author UUID NOT NULL,
      id TEXT NOT NULL,
      version TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      source TEXT NOT NULL,
      published_on DOUBLE PRECISION NOT NULL,
      sequence BIGSERIAL UNIQUE NOT NULL,
      PRIMARY KEY (author, id, version),
      FOREIGN KEY (author, id) REFERENCES marketplace.packages (author, id)
    )`
    await this.sql`CREATE INDEX IF NOT EXISTS marketplace_packages_order
      ON marketplace.packages (published_on DESC, author, id)`
    await this.sql`CREATE INDEX IF NOT EXISTS marketplace_releases_order
      ON marketplace.releases (author, id, sequence DESC)`
  }

  async close (): Promise<void> {
    await this.sql.end()
  }

  async list ({ viewer, search, author, offset, limit }: CatalogListOptions): Promise<CatalogPage<CatalogPackage>> {
    // strpos treats user-supplied %, _ and backslashes as literal search text.
    const items = await this.sql<CatalogPackage[]>`
      SELECT id, author, visibility, name, description, kind, latest_version AS version,
        author_name AS "authorName", contact_email AS "contactEmail", published_on AS "publishedOn"
      FROM marketplace.packages
      WHERE (${author ?? null}::uuid IS NULL OR author = ${author ?? null})
        AND (visibility = 'public' OR author = ${viewer})
        AND strpos(lower(name || ' ' || description || ' ' || author_name), lower(${search})) > 0
      ORDER BY published_on DESC, author, id LIMIT ${limit + 1} OFFSET ${offset}`
    return page(
      items.map(({ contactEmail, ...item }) => ({
        ...item,
        ...(contactEmail == null ? {} : { contactEmail })
      })),
      offset,
      limit
    )
  }

  async get ({ id, author }: CatalogPackageIdentity, viewer: AccountUuid): Promise<CatalogPackage> {
    const rows = await this.sql<CatalogPackage[]>`
      SELECT id, author, visibility, name, description, kind, latest_version AS version,
        author_name AS "authorName", contact_email AS "contactEmail", published_on AS "publishedOn"
      FROM marketplace.packages
      WHERE id = ${id} AND author = ${author} AND (visibility = 'public' OR author = ${viewer})`
    if (rows[0] === undefined) throw new CatalogError(404, 'Package not found')
    const { contactEmail, ...item } = rows[0]
    return { ...item, ...(contactEmail == null ? {} : { contactEmail }) }
  }

  async setVisibility (
    { id, author }: CatalogPackageIdentity,
    viewer: AccountUuid,
    visibility: CatalogPackageVisibility
  ): Promise<void> {
    const rows = await this.sql<Array<{ id: string }>>`
      UPDATE marketplace.packages SET visibility = ${visibility}
      WHERE id = ${id} AND author = ${author} AND author = ${viewer} RETURNING id`
    if (rows.length === 0) throw new CatalogError(404, 'Package not found')
  }

  async releases (
    identity: CatalogPackageIdentity,
    viewer: AccountUuid,
    offset: number
  ): Promise<CatalogPage<CatalogRelease>> {
    await this.get(identity, viewer)
    const { id, author } = identity
    const items = await this.sql<CatalogRelease[]>`
      SELECT r.id, r.author, r.version, r.content_hash AS "contentHash", r.published_on AS "publishedOn"
      FROM marketplace.releases r
      JOIN marketplace.packages p ON r.id = p.id AND r.author = p.author
      WHERE r.id = ${id} AND r.author = ${author} AND (p.visibility = 'public' OR p.author = ${viewer})
      ORDER BY r.sequence DESC LIMIT 51 OFFSET ${offset}`
    return page(items, offset, 50)
  }

  async download ({ id, author }: CatalogPackageIdentity, viewer: AccountUuid, version?: string): Promise<string> {
    const rows = await this.sql<Array<{ source: string }>>`
      SELECT r.source FROM marketplace.releases r
      JOIN marketplace.packages p ON r.id = p.id AND r.author = p.author
      WHERE r.id = ${id} AND r.author = ${author} AND r.version = COALESCE(${version ?? null}, p.latest_version)
        AND (p.visibility = 'public' OR p.author = ${viewer})`
    if (rows[0] === undefined) throw new CatalogError(404, 'Package release not found')
    return rows[0].source
  }

  async publish (publication: CatalogPublication): Promise<CatalogRelease> {
    const { visibility } = publication
    const { id, author, version, kind, name, description, authorName, contactEmail, publishedOn, contentHash, source } =
      publication
    const result = await this.sql.begin(async (sql) => {
      await sql`INSERT INTO marketplace.packages
        (id, author, visibility, name, description, kind, latest_version, author_name, contact_email, published_on)
        VALUES (${id}, ${author}, ${visibility ?? 'public'}, ${name}, ${description}, ${kind}, '', ${authorName}, ${contactEmail ?? null}, ${publishedOn})
        ON CONFLICT (author, id) DO NOTHING`
      // Lock before reading the latest version: parallel publications must serialize per author/package.
      const [current] = await sql<Array<{ version: string, kind: string }>>`
        SELECT latest_version AS version, kind FROM marketplace.packages
        WHERE id = ${id} AND author = ${author} FOR UPDATE`
      const [existing] = await sql<CatalogRelease[]>`
        SELECT id, author, version, content_hash AS "contentHash", published_on AS "publishedOn"
        FROM marketplace.releases WHERE id = ${id} AND author = ${author} AND version = ${version}`
      if (existing !== undefined) {
        if (existing.contentHash !== contentHash) {
          throw new CatalogError(409, 'This version already contains different content')
        }
        if (visibility !== undefined) {
          await sql`UPDATE marketplace.packages SET visibility = ${visibility} WHERE id = ${id} AND author = ${author}`
        }
        return existing
      }
      if (current.kind !== kind) throw new CatalogError(409, 'Package kind cannot change')
      if (current.version !== '' && compareDefinitionPackageVersions(version, current.version) <= 0) {
        throw new CatalogError(409, 'Publish a version newer than the latest release')
      }
      await sql`INSERT INTO marketplace.releases (id, author, version, content_hash, source, published_on)
        VALUES (${id}, ${author}, ${version}, ${contentHash}, ${source}, ${publishedOn})`
      await sql`UPDATE marketplace.packages SET name = ${name}, description = ${description}, latest_version = ${version},
        author_name = ${authorName}, contact_email = ${contactEmail ?? null}, published_on = ${publishedOn},
        visibility = COALESCE(${visibility ?? null}, visibility)
        WHERE id = ${id} AND author = ${author}`
      return { id, author, version, contentHash, publishedOn }
    })
    return result
  }
}

function page<T> (items: T[], offset: number, limit: number): CatalogPage<T> {
  return { items: items.slice(0, limit), ...(items.length > limit ? { nextOffset: offset + limit } : {}) }
}
