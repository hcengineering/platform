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
  if (isInitialized) return
  const start = performance.now()
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
  isInitialized = true
  const end = performance.now()
  const resTime = (end - start) / 1000
  console.log(`🎉 All migrations complete in ${resTime.toFixed(2)} sec`)
}

function getMigrations(): [string, string][] {
  return [
    migrationV1_1(),
    migrationV2_1(),
    migrationV3_1(),
    migrationV4_1(),
    migrationV4_2(),
    migrationV5_1(),
    migrationV5_2(),
    migrationV5_3(),
    migrationV5_4(),
    migrationV5_5(),
    migrationV5_6(),
    migrationV6_1(),
    migrationV6_2()
  ]
}

function migrationV1_1(): [string, string] {
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

function migrationV2_1(): [string, string] {
  const sql = `
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
  return ['init_labels_02', sql]
}

function migrationV3_1(): [string, string] {
  const sql = `
      ALTER TABLE communication.collaborators
          ADD COLUMN IF NOT EXISTS card_type VARCHAR(255) NOT NULL DEFAULT 'card:class:Card';
  `
  return ['add_card_type_to_collaborators_03', sql]
}

function migrationV4_1(): [string, string] {
  const sql = `
      ALTER TABLE communication.messages
          ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
  `
  return ['message_add_external_id_column', sql]
}

function migrationV4_2(): [string, string] {
  const sql = `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_external_id
          ON communication.messages (external_id)
          WHERE external_id IS NOT NULL;
  `
  return ['message_add_external_id_column_unique_index', sql]
}

function migrationV5_1(): [string, string] {
  const sql = `
      ALTER TABLE communication.reactions
          DROP CONSTRAINT IF EXISTS reactions_workspace_id_card_id_message_id_fkey;
  `
  return ['remove-reactions-fk_v5_1', sql]
}

function migrationV5_2(): [string, string] {
  const sql = `
      ALTER TABLE communication.messages
          ALTER COLUMN id SET DEFAULT unique_rowid();

      ALTER TABLE communication.messages
          DROP CONSTRAINT IF EXISTS messages_pkey,
          ADD CONSTRAINT messages_pkey PRIMARY KEY (id);`
  return ['migrate-message-id_v5_2', sql]
}

function migrationV5_3(): [string, string] {
  const sql = `
      ALTER TABLE communication.messages_groups ADD COLUMN from_date TIMESTAMPTZ;
      ALTER TABLE communication.messages_groups ADD COLUMN to_date TIMESTAMPTZ;
      ALTER TABLE communication.patch ADD COLUMN message_created TIMESTAMPTZ;
      ALTER TABLE communication.files ADD COLUMN message_created TIMESTAMPTZ;
      ALTER TABLE communication.thread ADD COLUMN IF NOT EXISTS message_created TIMESTAMPTZ NOT NULL DEFAULT now();
      DROP INDEX IF EXISTS communication.thread_workspace_id_card_id_message_id_key CASCADE;
      ALTER TABLE communication.thread ADD CONSTRAINT thread_unique_constraint UNIQUE (message_id);
  `
  return ['add-date-columns_v5_3', sql]
}

function migrationV5_4(): [string, string] {
  const sql = `
      UPDATE communication.messages_groups
      SET from_date = from_sec::TIMESTAMPTZ,
          to_date = to_sec::TIMESTAMPTZ;

      ALTER TABLE communication.messages_groups ALTER COLUMN from_date SET NOT NULL;
      ALTER TABLE communication.messages_groups ALTER COLUMN to_date SET NOT NULL;

      ALTER TABLE communication.messages_groups DROP COLUMN from_sec;
      ALTER TABLE communication.messages_groups DROP COLUMN to_sec;

      UPDATE communication.patch
      SET message_created = message_created_sec::TIMESTAMPTZ;

      ALTER TABLE communication.patch ALTER COLUMN message_created SET NOT NULL;
      ALTER TABLE communication.patch DROP COLUMN message_created_sec;

      UPDATE communication.files
      SET message_created = message_created_sec::TIMESTAMPTZ;

      ALTER TABLE communication.files ALTER COLUMN message_created SET NOT NULL;
      ALTER TABLE communication.files DROP COLUMN message_created_sec;
  `
  return ['migrate-date-values_v5_4', sql]
}

function migrationV5_5(): [string, string] {
  const sql = `
      ALTER TABLE communication.reactions
          DROP CONSTRAINT IF EXISTS reactions_pkey;
      ALTER TABLE communication.reactions
          ADD CONSTRAINT reactions_pkey PRIMARY KEY (message_id, creator, reaction);
  `
  return ['migrate-reactions-pk_v5_5', sql]
}

function migrationV5_6(): [string, string] {
  const sql = `
    ALTER TABLE communication.files
      DROP CONSTRAINT IF EXISTS files_pkey;
    ALTER TABLE communication.files
      ADD CONSTRAINT files_pkey PRIMARY KEY (message_id, blob_id);

    ALTER TABLE communication.reactions
      ADD CONSTRAINT reactions_message_fkey FOREIGN KEY (message_id)
        REFERENCES communication.messages (id) ON DELETE CASCADE;
  `
  return ['migrate-constraints_v5_6', sql]
}

function migrationV6_1(): [string, string] {
  const sql = `
    DROP INDEX IF EXISTS communication.idx_messages_unique_external_id CASCADE;
  `
  return ['message_drop_external_id_unique_index', sql]
}

function migrationV6_2(): [string, string] {
  const sql = `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_workspace_card_external_id
          ON communication.messages (workspace_id, card_id, external_id)
          WHERE external_id IS NOT NULL;
  `
  return ['idx_messages_unique_workspace_card_external_id', sql]
}
