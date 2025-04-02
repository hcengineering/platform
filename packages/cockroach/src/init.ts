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

let isInitialized = false

export async function initSchema(sql: postgres.Sql) {
  if(isInitialized) return
  console.log('🗃️ Initializing schema...')
  await sql.unsafe('CREATE SCHEMA IF NOT EXISTS communication;')
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${migrationsTableName}
                    (
                        name       VARCHAR(255) NOT NULL,
                        created_on TIMESTAMPTZ  NOT NULL DEFAULT now()
                    )`)

  const appliedMigrations = await sql.unsafe(`SELECT name
                                              FROM ${migrationsTableName}`)
  const appliedNames = appliedMigrations.map((it) => it.name)

  const migrations = [migrationO1()]
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
  isInitialized = true
  console.log('🎉 All migrations complete')
}

function migrationO1(): [string, string] {
  const sql = `
      CREATE TABLE IF NOT EXISTS communication.messages
      (
          workspace_id UUID         NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          id           INT8         NOT NULL,

          content      TEXT         NOT NULL,
          creator      VARCHAR(255) NOT NULL,
          created      TIMESTAMPTZ  NOT NULL,

          type         VARCHAR(255) NOT NULL,
          data         JSONB        NOT NULL DEFAULT '{}',


          PRIMARY KEY (workspace_id, card_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_workspace_card ON communication.messages (workspace_id, card_id);
      CREATE INDEX IF NOT EXISTS idx_messages_workspace_card_id ON communication.messages (workspace_id, card_id, id);

      CREATE TABLE IF NOT EXISTS communication.messages_groups
      (
          workspace_id UUID           NOT NULL,
          card_id      VARCHAR(255)   NOT NULL,
          blob_id      UUID           NOT NULL,

          from_sec     TIMESTAMPTZ(0) NOT NULL,
          to_sec       TIMESTAMPTZ(0) NOT NULL,
          count        INT            NOT NULL,

          PRIMARY KEY (workspace_id, card_id, blob_id)
      );


      CREATE INDEX IF NOT EXISTS idx_messages_groups_workspace_card ON communication.messages_groups (workspace_id, card_id);
      CREATE TABLE IF NOT EXISTS communication.patch
      (
          id                  INT8           NOT NULL DEFAULT unique_rowid(),
          workspace_id        UUID           NOT NULL,
          card_id             VARCHAR(255)   NOT NULL,
          message_id          INT8           NOT NULL,
          type                VARCHAR(255)   NOT NULL,
          content             TEXT           NOT NULL,
          creator             VARCHAR(255)   NOT NULL,
          created             TIMESTAMPTZ    NOT NULL,
          message_created_sec TIMESTAMPTZ(0) NOT NULL,

          PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_patch_workspace_card_message ON communication.patch (workspace_id, card_id, message_id);
      CREATE TABLE IF NOT EXISTS communication.files
      (
          workspace_id        UUID           NOT NULL,
          card_id             VARCHAR(255)   NOT NULL,
          message_id          INT8           NOT NULL,

          blob_id             UUID           NOT NULL,
          filename            VARCHAR(255)   NOT NULL,
          type                VARCHAR(255)   NOT NULL,
          size                INT8           NOT NULL,

          creator             VARCHAR(255)   NOT NULL,
          created             TIMESTAMPTZ    NOT NULL DEFAULT now(),

          message_created_sec TIMESTAMPTZ(0) NOT NULL,

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

          FOREIGN KEY (workspace_id, card_id, message_id) REFERENCES communication.messages (workspace_id, card_id, id) ON DELETE CASCADE,
          PRIMARY KEY (workspace_id, card_id, message_id, creator, reaction)
      );

      CREATE INDEX IF NOT EXISTS idx_reactions_workspace_card_message ON communication.reactions (workspace_id, card_id, message_id);
      CREATE TABLE IF NOT EXISTS communication.thread
      (
          workspace_id  UUID         NOT NULL,
          card_id       VARCHAR(255) NOT NULL,
          message_id    INT8         NOT NULL,
          thread_id     VARCHAR(255) NOT NULL,
          replies_count INT          NOT NULL,
          last_reply    TIMESTAMPTZ  NOT NULL,

          PRIMARY KEY (workspace_id, thread_id),
          UNIQUE (workspace_id, card_id, message_id)
      );

      CREATE INDEX IF NOT EXISTS idx_thread_workspace_card_message ON communication.thread (workspace_id, thread_id);
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
          message_id INT8,
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

          PRIMARY KEY (workspace_id, card_id, account)
      );
  `
  return ['init_tables_01', sql]
}
