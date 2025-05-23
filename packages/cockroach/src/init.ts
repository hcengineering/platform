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

import type postgres from 'postgres'

const migrationsTableName = 'communication._migrations'

let isSchemaInitialized = false
let initPromise: Promise<void> | null = null

export function isInitialized(): boolean {
  return isSchemaInitialized
}

export async function initSchema(sql: postgres.Sql): Promise<void> {
  if (isInitialized()) return

  if (!initPromise) {
    initPromise = (async () => {
      const maxAttempts = 3
      const retryDelay = 3000

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await init(sql)
          isSchemaInitialized = true
          return
        } catch (err) {
          if (attempt === maxAttempts) {
            throw err
          }
          console.warn(`InitSchema attempt ${attempt} failed, retrying in ${retryDelay}ms…`, err)
          await delay(retryDelay)
        }
      }
    })()
      .catch((err) => {
        throw err
      })
      .finally(() => {
        initPromise = null
      })
  }

  await initPromise
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

async function init(sql: postgres.Sql) {
  if (isSchemaInitialized) return
  const start = performance.now()
  console.log('🗃️ Initializing schema...')
  await sql.unsafe('CREATE SCHEMA IF NOT EXISTS communication;')
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${migrationsTableName}
                    (
                        name       VARCHAR(255) NOT NULL,
                        created_on TIMESTAMPTZ  NOT NULL DEFAULT now(),
                        PRIMARY KEY (name)
                    )`)

  const appliedMigrations = await sql.unsafe(`SELECT name
                                              FROM ${migrationsTableName}`)
  const appliedNames = appliedMigrations.map((it) => it.name)

  const migrations = getMigrations()
  for (const [name, sqlString] of migrations) {
    if (appliedNames.includes(name)) continue
    try {
      await sql.unsafe(sqlString)
      await sql.unsafe(
        `INSERT INTO ${migrationsTableName}(name)
         VALUES ($1::varchar);`,
        [name]
      )
      console.log(`✅ Migration ${name} applied`)
    } catch (err) {
      console.error(`❌ Failed on ${name}:`, err)
      throw err
    }
  }
  isSchemaInitialized = true
  const end = performance.now()
  const resTime = (end - start) / 1000
  console.log(`🎉 All migrations complete in ${resTime.toFixed(2)} sec`)
}

function getMigrations(): [string, string][] {
  return [
    migrationV1_1(),
    migrationV1_2(),
    migrationV2_1(),
    migrationV2_2(),
    migrationV2_3(),
    migrationV2_4(),
    migrationV2_5(),
    migrationV2_6(),
    migrationV2_7(),
    migrationV3_1()
  ]
}

function migrationV1_1(): [string, string] {
  const sql = `
      DROP SCHEMA IF EXISTS communication CASCADE;
      CREATE SCHEMA IF NOT EXISTS communication;
      CREATE TABLE IF NOT EXISTS ${migrationsTableName}
      (
          name       VARCHAR(255) NOT NULL,
          created_on TIMESTAMPTZ  NOT NULL DEFAULT now(),
          PRIMARY KEY (name)
      )
  `

  return ['recreate_schema-v1_1', sql]
}

function migrationV1_2(): [string, string] {
  const sql = `
      CREATE TABLE IF NOT EXISTS communication.messages
      (
          workspace_id UUID         NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          id           INT8         NOT NULL DEFAULT unique_rowid(),
          content      TEXT         NOT NULL,
          creator      VARCHAR(255) NOT NULL,
          created      TIMESTAMPTZ  NOT NULL,
          type         VARCHAR(255) NOT NULL,
          data         JSONB        NOT NULL DEFAULT '{}',
          external_id  VARCHAR(255),
          PRIMARY KEY (workspace_id, card_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_workspace_card ON communication.messages (workspace_id, card_id);
      CREATE INDEX IF NOT EXISTS idx_messages_workspace_card_id ON communication.messages (workspace_id, card_id, id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_workspace_card_external_id
          ON communication.messages (workspace_id, card_id, external_id)
          WHERE external_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS communication.messages_groups
      (
          workspace_id UUID         NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          blob_id      UUID         NOT NULL,
          from_date    TIMESTAMPTZ  NOT NULL,
          to_date      TIMESTAMPTZ  NOT NULL,
          count        INT          NOT NULL,
          PRIMARY KEY (workspace_id, card_id, blob_id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_groups_workspace_card ON communication.messages_groups (workspace_id, card_id);

      CREATE TABLE IF NOT EXISTS communication.patch
      (
          id              INT8         NOT NULL DEFAULT unique_rowid(),
          workspace_id    UUID         NOT NULL,
          card_id         VARCHAR(255) NOT NULL,
          message_id      INT8         NOT NULL,
          type            VARCHAR(255) NOT NULL,
          creator         VARCHAR(255) NOT NULL,
          created         TIMESTAMPTZ  NOT NULL,
          message_created TIMESTAMPTZ  NOT NULL,
          data            JSONB        NOT NULL DEFAULT '{}',
          PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_patch_workspace_card_message ON communication.patch (workspace_id, card_id, message_id);

      CREATE TABLE IF NOT EXISTS communication.files
      (
          workspace_id    UUID         NOT NULL,
          card_id         VARCHAR(255) NOT NULL,
          message_id      INT8         NOT NULL,
          blob_id         UUID         NOT NULL,
          filename        VARCHAR(255) NOT NULL,
          type            VARCHAR(255) NOT NULL,
          size            INT8         NOT NULL,
          meta            JSONB        NOT NULL DEFAULT '{}',
          creator         VARCHAR(255) NOT NULL,
          created         TIMESTAMPTZ  NOT NULL DEFAULT now(),
          message_created TIMESTAMPTZ  NOT NULL,
          PRIMARY KEY (workspace_id, card_id, message_id, blob_id)
      );

      CREATE INDEX IF NOT EXISTS files_workspace_card_message_idx ON communication.files (workspace_id, card_id, message_id);

      CREATE TABLE IF NOT EXISTS communication.reactions
      (
          workspace_id UUID         NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          message_id   INT8         NOT NULL,
          reaction     VARCHAR(100) NOT NULL,
          creator      VARCHAR(255) NOT NULL,
          created      TIMESTAMPTZ  NOT NULL DEFAULT now(),
          PRIMARY KEY (workspace_id, card_id, message_id, creator, reaction),
          FOREIGN KEY (workspace_id, card_id, message_id) REFERENCES communication.messages (workspace_id, card_id, id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_reactions_workspace_card_message ON communication.reactions (workspace_id, card_id, message_id);

      CREATE TABLE IF NOT EXISTS communication.thread
      (
          workspace_id    UUID         NOT NULL,
          card_id         VARCHAR(255) NOT NULL,
          message_id      INT8         NOT NULL,
          thread_id       VARCHAR(255) NOT NULL,
          thread_type     VARCHAR(255) NOT NULL,
          replies_count   INT          NOT NULL,
          last_reply      TIMESTAMPTZ  NOT NULL,
          message_created TIMESTAMPTZ  NOT NULL DEFAULT now(),
          PRIMARY KEY (workspace_id, thread_id),
          CONSTRAINT thread_unique_constraint UNIQUE (workspace_id, card_id, message_id)
      );

      CREATE INDEX IF NOT EXISTS idx_thread_workspace_thread_message ON communication.thread (workspace_id, thread_id);
      CREATE INDEX IF NOT EXISTS idx_thread_workspace_card_message ON communication.thread (workspace_id, card_id, message_id);

      CREATE TABLE IF NOT EXISTS communication.notification_context
      (
          id           INT8         NOT NULL DEFAULT unique_rowid(),
          workspace_id UUID         NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          account      UUID         NOT NULL,
          last_view    TIMESTAMPTZ  NOT NULL DEFAULT now(),
          last_update  TIMESTAMPTZ  NOT NULL DEFAULT now(),
          PRIMARY KEY (id),
          UNIQUE (workspace_id, card_id, account)
      );

      CREATE TABLE IF NOT EXISTS communication.notifications
      (
          id         INT8        NOT NULL DEFAULT unique_rowid(),
          context_id INT8        NOT NULL,
          read       BOOLEAN     NOT NULL DEFAULT false,
          message_id INT8        NOT NULL,
          created    TIMESTAMPTZ NOT NULL,
          content    JSONB       NOT NULL DEFAULT '{}',
          PRIMARY KEY (id),
          FOREIGN KEY (context_id) REFERENCES communication.notification_context (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS notification_context_idx ON communication.notifications (context_id);

      CREATE TABLE IF NOT EXISTS communication.collaborators
      (
          workspace_id UUID         NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          account      UUID         NOT NULL,
          date         TIMESTAMPTZ  NOT NULL DEFAULT now(),
          card_type    VARCHAR(255) NOT NULL,
          PRIMARY KEY (workspace_id, card_id, account)
      );

      CREATE TABLE IF NOT EXISTS communication.label
      (
          workspace_id UUID         NOT NULL,
          label_id     VARCHAR(255) NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          card_type    VARCHAR(255) NOT NULL,
          account      UUID         NOT NULL,
          created      TIMESTAMPTZ  NOT NULL DEFAULT now(),
          PRIMARY KEY (workspace_id, card_id, label_id, account)
      );
  `
  return ['reinit_tables-v1_2', sql]
}

function migrationV2_1(): [string, string] {
  const sql = `
      ALTER TABLE communication.notifications
          ADD COLUMN IF NOT EXISTS type VARCHAR(255) NOT NULL DEFAULT 'message';
  `
  return ['add_type_column_to_notifications-v2_1', sql]
}

function migrationV2_2(): [string, string] {
  const sql = `
      ALTER TABLE communication.notifications
          ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;
  `
  return ['add_read_column_to_notifications-v2_2', sql]
}

function migrationV2_3(): [string, string] {
  const sql = `UPDATE communication.notifications SET read = true; `
  return ['set_read_to_true-v2_3', sql]
}

function migrationV2_4(): [string, string] {
  const sql = `
      ALTER TABLE communication.notifications
          ADD COLUMN IF NOT EXISTS message_created TIMESTAMPTZ;
  `
  return ['add_message_created_column_to_notifications-v2_4', sql]
}

function migrationV2_5(): [string, string] {
  const sql = `
      UPDATE communication.notifications
      SET message_created = created;

      ALTER TABLE communication.notifications
          ALTER COLUMN message_created SET NOT NULL;
  `
  return ['init_and_set_not_null_message_created_notifications-v2_4', sql]
}

function migrationV2_6(): [string, string] {
  const sql = `
      ALTER TABLE communication.notification_context
          ADD COLUMN IF NOT EXISTS last_notify TIMESTAMPTZ;
  `
  return ['add_last_notify_column_to_notification_context-v2_6', sql]
}

function migrationV2_7(): [string, string] {
  const sql = `
      UPDATE communication.notification_context
      SET last_notify = last_update;`

  return ['set_last_notify_to_last_update-v2_7', sql]
}

function migrationV3_1(): [string, string] {
  const sql = `
      CREATE TABLE IF NOT EXISTS communication.link_preview
      (
          id              INT8         NOT NULL DEFAULT unique_rowid(),
          workspace_id    UUID         NOT NULL,
          card_id         VARCHAR(255) NOT NULL,
          message_id      INT8         NOT NULL,
          message_created TIMESTAMPTZ  NOT NULL,
          url             TEXT         NOT NULL,
          host            TEXT         NOT NULL,
          hostname        TEXT,
          title           TEXT,
          description     TEXT,
          favicon         TEXT,
          image           JSONB,
          creator         VARCHAR(255) NOT NULL,
          created         TIMESTAMPTZ  NOT NULL DEFAULT now(),
          PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS workspace_id_card_id_message_id_idx ON communication.link_preview (workspace_id, card_id, message_id);
  `

  return ['init_link_preview-v3_1', sql]
}
