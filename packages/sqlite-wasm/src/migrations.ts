import type { Sqlite3Worker1Promiser } from './connection'

export async function applyMigrations(worker: Sqlite3Worker1Promiser, dbId: string): Promise<void> {
  await migrationV1(worker, dbId)
}

async function migrationV1(worker: Sqlite3Worker1Promiser, dbId: string): Promise<void> {
  await worker('exec', {
    dbId,
    sql: `
            CREATE TABLE IF NOT EXISTS message
            (
                id           TEXT     NOT NULL,
                workspace_id TEXT     NOT NULL,
                thread_id    TEXT     NOT NULL,
                content      TEXT     NOT NULL,
                creator      TEXT     NOT NULL,
                created      DATETIME NOT NULL,
                PRIMARY KEY (id)
            )
        `
  })

  await worker('exec', {
    dbId,
    sql: `
            CREATE TABLE IF NOT EXISTS patch
            (
                id         TEXT         NOT NULL,
                message_id TEXT         NOT NULL,
                content    TEXT         NOT NULL,
                creator    VARCHAR(255) NOT NULL,
                created    DATETIME     NOT NULL,

                PRIMARY KEY (id),
                FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE
            )
        `
  })
  await worker('exec', {
    dbId,
    sql: `CREATE INDEX IF NOT EXISTS idx_patch_message_id ON patch (message_id)`
  })

  await worker('exec', {
    dbId,
    sql: `
            CREATE TABLE IF NOT EXISTS attachment
            (
                message_id TEXT         NOT NULL,
                card_id    TEXT         NOT NULL,
                creator    VARCHAR(255) NOT NULL,
                created    DATETIME     NOT NULL,

                PRIMARY KEY (message_id, card_id),
                FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE
            )
        `
  })

  await worker('exec', {
    dbId,
    sql: `CREATE INDEX IF NOT EXISTS attachment_message_idx ON attachment (message_id)`
  })

  await worker('exec', {
    dbId,
    sql: `
            CREATE TABLE IF NOT EXISTS reaction
            (
                message_id TEXT         NOT NULL,
                reaction   TEXT         NOT NULL,
                creator    VARCHAR(255) NOT NULL,
                created    DATETIME     NOT NULL,

                PRIMARY KEY (message_id, creator, reaction),
                FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE
            )
        `
  })

  await worker('exec', {
    dbId,
    sql: `CREATE INDEX IF NOT EXISTS reaction_message_idx ON reaction (message_id)`
  })

  await worker('exec', {
    dbId,
    sql: `
            CREATE TABLE IF NOT EXISTS notification_context
            (
                id               TEXT NOT NULL,
                workspace_id     TEXT NOT NULL,
                card_id          TEXT NOT NULL,
                personal_workspace TEXT NOT NULL,
                archived_from    DATETIME,
                last_view        DATETIME,
                last_update      DATETIME,

                PRIMARY KEY (id),
                UNIQUE (workspace_id, card_id, personal_workspace)
            );

            CREATE TABLE IF NOT EXISTS notification
            (
                message_id TEXT NOT NULL,
                context_id TEXT NOT NULL,

                PRIMARY KEY (message_id, context_id),
                FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE,
                FOREIGN KEY (context_id) REFERENCES notification_context (id) ON DELETE CASCADE
            );
        `
  })
}
