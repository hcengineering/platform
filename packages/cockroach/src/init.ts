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
import { Domain } from '@hcengineering/communication-sdk-types'

/* eslint-disable @typescript-eslint/naming-convention */

const migrationsDomain = 'communication._migrations'

let isSchemaInitialized = false
let initPromise: Promise<void> | null = null

export function isInitialized (): boolean {
  return isSchemaInitialized
}

export async function initSchema (sql: postgres.Sql): Promise<void> {
  if (isInitialized()) return

  if (initPromise == null) {
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

function delay (ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function init (sql: postgres.Sql): Promise<void> {
  if (isSchemaInitialized) return
  const start = performance.now()
  console.log('🗃️ Initializing schema...')
  await sql.unsafe('CREATE SCHEMA IF NOT EXISTS communication;')
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${migrationsDomain}
                    (
                        name       VARCHAR(255) NOT NULL,
                        created_on TIMESTAMPTZ  NOT NULL DEFAULT now(),
                        PRIMARY KEY (name)
                    )`)

  const appliedMigrations = await sql.unsafe(`SELECT name
                                              FROM ${migrationsDomain}`)
  const appliedNames = appliedMigrations.map((it) => it.name)

  const migrations = getMigrations()
  for (const [name, sqlString] of migrations) {
    if (appliedNames.includes(name)) continue
    try {
      await sql.unsafe(sqlString)
      await sql.unsafe(
        `INSERT INTO ${migrationsDomain}(name)
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

function getMigrations (): [string, string][] {
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
    migrationV4_1(),
    migrationV5_1(),
    migrationV5_2(),
    migrationV6_1(),
    migrationV6_2(),
    migrationV6_3(),
    migrationV6_4(),
    migrationV6_5(),
    migrationV6_6(),
    migrationV6_7(),
    migrationV6_8(),
    migrationV7_1(),
    migrationV7_2(),
    migrationV7_3(),
    migrationV8_1(),
    migrationV8_2(),
    migrationV8_3(),
    migrationV9_1()
  ]
}

function migrationV1_1 (): [string, string] {
  const sql = `
      DROP SCHEMA IF EXISTS communication CASCADE;
      CREATE SCHEMA IF NOT EXISTS communication;
      CREATE TABLE IF NOT EXISTS ${migrationsDomain}
      (
          name       VARCHAR(255) NOT NULL,
          created_on TIMESTAMPTZ  NOT NULL DEFAULT now(),
          PRIMARY KEY (name)
      )
  `

  return ['recreate_schema-v1_1', sql]
}

function migrationV1_2 (): [string, string] {
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
          PRIMARY KEY (workspace_id, card_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_workspace_card ON communication.messages (workspace_id, card_id);
      CREATE INDEX IF NOT EXISTS idx_messages_workspace_card_id ON communication.messages (workspace_id, card_id, id);

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

function migrationV2_1 (): [string, string] {
  const sql = `
      ALTER TABLE communication.notifications
          ADD COLUMN IF NOT EXISTS type VARCHAR(255) NOT NULL DEFAULT 'message';
  `
  return ['add_type_column_to_notifications-v2_1', sql]
}

function migrationV2_2 (): [string, string] {
  const sql = `
      ALTER TABLE communication.notifications
          ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;
  `
  return ['add_read_column_to_notifications-v2_2', sql]
}

function migrationV2_3 (): [string, string] {
  const sql = 'UPDATE communication.notifications SET read = true; '
  return ['set_read_to_true-v2_3', sql]
}

function migrationV2_4 (): [string, string] {
  const sql = `
      ALTER TABLE communication.notifications
          ADD COLUMN IF NOT EXISTS message_created TIMESTAMPTZ;
  `
  return ['add_message_created_column_to_notifications-v2_4', sql]
}

function migrationV2_5 (): [string, string] {
  const sql = `
      UPDATE communication.notifications
      SET message_created = created;

      ALTER TABLE communication.notifications
          ALTER COLUMN message_created SET NOT NULL;
  `
  return ['init_and_set_not_null_message_created_notifications-v2_4', sql]
}

function migrationV2_6 (): [string, string] {
  const sql = `
      ALTER TABLE communication.notification_context
          ADD COLUMN IF NOT EXISTS last_notify TIMESTAMPTZ;
  `
  return ['add_last_notify_column_to_notification_context-v2_6', sql]
}

function migrationV2_7 (): [string, string] {
  const sql = `
      UPDATE communication.notification_context
      SET last_notify = last_update;`

  return ['set_last_notify_to_last_update-v2_7', sql]
}

function migrationV4_1 (): [string, string] {
  const sql = `
      CREATE INDEX IF NOT EXISTS notifications_context_id_read_created_desc_idx ON communication.notifications (context_id, read, created DESC);
  `
  return ['add_index_notifications_context_id_read_created_desc-v4_1', sql]
}

function migrationV5_1 (): [string, string] {
  const sql = `
      DROP INDEX IF EXISTS communication.idx_messages_unique_workspace_card_external_id;
      ALTER TABLE communication.messages
          DROP COLUMN IF EXISTS external_id;
      ALTER TABLE communication.thread
          DROP COLUMN IF EXISTS message_created;
  `
  return ['remove_unused-columns-v5_1', sql]
}

function migrationV5_2 (): [string, string] {
  const sql = `
      CREATE TABLE IF NOT EXISTS communication.message_created
      (
          workspace_id UUID         NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          message_id   INT8         NOT NULL,

          created      TIMESTAMPTZ  NOT NULL,
          PRIMARY KEY (workspace_id, card_id, message_id)
      );
  `
  return ['init_message_created_table-v5_2', sql]
}

function migrationV6_1 (): [string, string] {
  const sql = `
      ALTER TABLE communication.messages
          ADD COLUMN IF NOT EXISTS message_id_str VARCHAR(22);
      ALTER TABLE communication.patch
          ADD COLUMN IF NOT EXISTS message_id_str VARCHAR(22);
      ALTER TABLE communication.reactions
          ADD COLUMN IF NOT EXISTS message_id_str VARCHAR(22);
      ALTER TABLE communication.thread
          ADD COLUMN IF NOT EXISTS message_id_str VARCHAR(22);
      ALTER TABLE communication.notifications
          ADD COLUMN IF NOT EXISTS message_id_str VARCHAR(22);
      ALTER TABLE communication.message_created
          ADD COLUMN IF NOT EXISTS message_id_str VARCHAR(22);
  `
  return ['add_message_id_str_columns-v6_1', sql]
}

function migrationV6_2 (): [string, string] {
  const sql = `
      UPDATE communication.messages
      SET message_id_str = id::text;
      UPDATE communication.patch
      SET message_id_str = message_id::text;
      UPDATE communication.reactions
      SET message_id_str = message_id::text;
      UPDATE communication.thread
      SET message_id_str = message_id::text;
      UPDATE communication.notifications
      SET message_id_str = message_id::text;
      UPDATE communication.message_created
      SET message_id_str = message_id::text;
  `
  return ['copy_int8_ids_to_str_columns-v6_2', sql]
}

function migrationV6_3 (): [string, string] {
  const sql = `
      ALTER TABLE communication.reactions
          DROP CONSTRAINT IF EXISTS reactions_workspace_id_card_id_message_id_fkey;

      DROP INDEX IF EXISTS communication.thread_unique_constraint CASCADE;

      DROP INDEX IF EXISTS communication.idx_patch_workspace_card_message;
      DROP INDEX IF EXISTS communication.idx_reactions_workspace_card_message;
      DROP INDEX IF EXISTS communication.idx_thread_workspace_card_message;
      DROP INDEX IF EXISTS communication.workspace_id_card_id_message_id_idx;
      DROP INDEX IF EXISTS communication.notifications_context_id_read_created_desc_idx;
      DROP INDEX IF EXISTS communication.notifications_type_storing_rec_idx;
  `
  return ['drop_constraints_and_indexes_for_rename-v6_3', sql]
}

function migrationV6_4 (): [string, string] {
  const sql = `
      ALTER TABLE communication.messages
          RENAME COLUMN id TO message_id_old;
      ALTER TABLE communication.messages
          RENAME COLUMN message_id_str TO id;

      ALTER TABLE communication.patch
          RENAME COLUMN message_id TO message_id_old;
      ALTER TABLE communication.patch
          RENAME COLUMN message_id_str TO message_id;

      ALTER TABLE communication.reactions
          RENAME COLUMN message_id TO message_id_old;
      ALTER TABLE communication.reactions
          RENAME COLUMN message_id_str TO message_id;

      ALTER TABLE communication.thread
          RENAME COLUMN message_id TO message_id_old;
      ALTER TABLE communication.thread
          RENAME COLUMN message_id_str TO message_id;

      ALTER TABLE communication.notifications
          RENAME COLUMN message_id TO message_id_old;
      ALTER TABLE communication.notifications
          RENAME COLUMN message_id_str TO message_id;

      ALTER TABLE communication.message_created
          RENAME COLUMN message_id TO message_id_old;
      ALTER TABLE communication.message_created
          RENAME COLUMN message_id_str TO message_id;
  `
  return ['rename_message_id_columns-v6_4', sql]
}

function migrationV6_5 (): [string, string] {
  const sql = `
      ALTER TABLE communication.messages
          ALTER COLUMN id SET NOT NULL;

      ALTER TABLE communication.message_created
          ALTER COLUMN message_id SET NOT NULL;
      ALTER TABLE communication.reactions
          ALTER COLUMN message_id SET NOT NULL;
      ALTER TABLE communication.thread
          ALTER COLUMN message_id SET NOT NULL;
      ALTER TABLE communication.notifications
          ALTER COLUMN message_id SET NOT NULL;

  `
  return ['make_message_id_not_null-v6_5', sql]
}

function migrationV6_6 (): [string, string] {
  const sql = `
      ALTER TABLE communication.messages
          ALTER PRIMARY KEY USING COLUMNS (workspace_id, card_id, id);
      ALTER TABLE communication.message_created
          ALTER PRIMARY KEY USING COLUMNS (workspace_id, card_id, message_id);
      ALTER TABLE communication.reactions
          ALTER PRIMARY KEY USING COLUMNS (workspace_id, card_id, message_id, creator, reaction);
  `
  return ['recrate_primary_keys-v6_6', sql]
}

function migrationV6_7 (): [string, string] {
  const sql = `
      ALTER TABLE communication.reactions
          ADD CONSTRAINT fk_reactions_message
              FOREIGN KEY (workspace_id, card_id, message_id)
                  REFERENCES communication.messages (workspace_id, card_id, id)
                  ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_patch_workspace_card_message
          ON communication.patch (workspace_id, card_id, message_id);

      CREATE INDEX IF NOT EXISTS idx_reactions_workspace_card_message
          ON communication.reactions (workspace_id, card_id, message_id);

      ALTER TABLE communication.thread
          ADD CONSTRAINT thread_unique_constraint UNIQUE (workspace_id, card_id, message_id);

      CREATE INDEX IF NOT EXISTS idx_thread_workspace_card_message
          ON communication.thread (workspace_id, card_id, message_id);

      CREATE INDEX IF NOT EXISTS notifications_context_id_read_created_desc_idx
          ON communication.notifications (context_id, read, created DESC);
  `
  return ['recreate_constraints_and_indexes-v6_7', sql]
}

function migrationV6_8 (): [string, string] {
  const sql = `
      ALTER TABLE communication.messages
          DROP COLUMN IF EXISTS message_id_old;
      ALTER TABLE communication.patch
          DROP COLUMN IF EXISTS message_id_old;
      ALTER TABLE communication.reactions
          DROP COLUMN IF EXISTS message_id_old;
      ALTER TABLE communication.thread
          DROP COLUMN IF EXISTS message_id_old;
      ALTER TABLE communication.notifications
          DROP COLUMN IF EXISTS message_id_old;
      ALTER TABLE communication.message_created
          DROP COLUMN IF EXISTS message_id_old;
  `
  return ['drop_old_message_id_columns-v6_8', sql]
}

function migrationV7_1 (): [string, string] {
  const sql = `
      ALTER TABLE communication.notifications
          ADD COLUMN IF NOT EXISTS blob_id UUID;
  `
  return ['add_blobId_to_notifications-v7_1', sql]
}

function migrationV7_2 (): [string, string] {
  const sql = `
      UPDATE communication.notifications AS n
      SET blob_id = mg.blob_id
      FROM communication.notification_context AS nc
               JOIN communication.messages_groups AS mg
                    ON mg.workspace_id = nc.workspace_id
                        AND mg.card_id = nc.card_id
      WHERE n.context_id = nc.id
        AND n.message_created BETWEEN mg.from_date AND mg.to_date
        AND n.blob_id IS NULL;
  `
  return ['fill_blobId_on_notifications-v7_2', sql]
}

function migrationV7_3 (): [string, string] {
  const sql = `
      UPDATE communication.notification_context
      SET last_notify = last_update
      WHERE last_notify IS NULL;

      ALTER TABLE communication.notification_context
          ALTER COLUMN last_notify SET NOT NULL;
  `
  return ['make_last_notify_not_null-v7_3', sql]
}

function migrationV8_1 (): [string, string] {
  const sql = `
      ALTER TABLE communication.messages
          RENAME TO message;
      ALTER TABLE communication.messages_groups
          RENAME TO messages_group;
      ALTER TABLE communication.reactions
          RENAME TO reaction;
      ALTER TABLE communication.notifications
          RENAME TO notification;
      ALTER TABLE communication.collaborators
          RENAME TO collaborator;
  `

  return ['rename_tables-v8_1', sql]
}

function migrationV8_2 (): [string, string] {
  const sql = `
      CREATE TABLE IF NOT EXISTS ${Domain.Attachment}
      (
          workspace_id UUID        NOT NULL,
          card_id      VARCHAR     NOT NULL,
          message_id   VARCHAR     NOT NULL,
          id           UUID        NOT NULL,
          type         TEXT        NOT NULL,
          params       JSONB       NOT NULL,
          creator      VARCHAR     NOT NULL,
          created      TIMESTAMPTZ NOT NULL,
          modified     TIMESTAMPTZ,
          PRIMARY KEY (workspace_id, card_id, message_id, id)
      );
  `
  return ['create_attachment_table-v8_2', sql]
}

function migrationV8_3 (): [string, string] {
  const sql = `
      CREATE INDEX IF NOT EXISTS attachment_workspace_card_message_idx ON ${Domain.Attachment} (workspace_id, card_id, message_id)
  `
  return ['add_attachment_indexes-v8_3', sql]
}

// CREATE TABLE ${Domain.CardPeerGroup}
// (
//     group_id     UUID         NOT NULL,
//     workspace_id UUID         NOT NULL,
//     card_id      VARCHAR(255) NOT NULL,
//     created   TIMESTAMPTZ  NOT NULL DEFAULT now(),
//     PRIMARY KEY (group_id,workspace_id, card_id)
// );

function migrationV9_1 (): [string, string] {
  const sql = `
      CREATE TABLE IF NOT EXISTS ${Domain.Peer}
      (
          workspace_id UUID         NOT NULL,
          card_id      VARCHAR(255) NOT NULL,
          kind         TEXT         NOT NULL,
          value        TEXT         NOT NULL,
          extra        JSONB        NOT NULL DEFAULT '{}',
          created      TIMESTAMPTZ  NOT NULL DEFAULT now(),
          PRIMARY KEY (workspace_id, card_id, kind, value)
      );

      CREATE INDEX IF NOT EXISTS peer_workspace_card_kind ON ${Domain.Peer} (workspace_id, card_id, kind);
      CREATE INDEX IF NOT EXISTS peer_kind_value ON ${Domain.Peer} (kind, value);`
  return ['init_peer_tables-v9_1', sql]
}
