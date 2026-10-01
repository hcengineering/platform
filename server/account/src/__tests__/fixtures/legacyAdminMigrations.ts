//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type DBFlavor } from '../../types'

/**
 * Migrations that were shipped by an earlier, unmerged revision of the admin
 * user management work (ids `account_db_v27_admin_user_management` …
 * `account_db_v30_admin_audit_log_batch_id_idx`) and are already applied on
 * some self-hosted deployments. The DDL is copied verbatim so the upgrade test
 * can reproduce that schema state and prove the foundation migration
 * (`account_db_v28_account_lifecycle_admin_audit`) applies cleanly on top of it.
 *
 * Test fixture only — never register these in getMigrations().
 */
const legacyTypes = {
  ['cockroach' as DBFlavor]: { string: 'STRING', int4: 'INT4', int8: 'INT8' },
  ['postgres' as DBFlavor]: { string: 'TEXT', int4: 'INTEGER', int8: 'BIGINT' }
}

export function getLegacyAdminMigrations (ns: string, flavor: DBFlavor): Array<[string, string]> {
  const types = legacyTypes[flavor]
  if (types === undefined) {
    throw new Error(`Unsupported database flavor: ${flavor}`)
  }
  return [
    [
      'account_db_v27_admin_user_management',
      `
    /* Account: disable + token-version + last activity */
    ALTER TABLE ${ns}.account
      ADD COLUMN IF NOT EXISTS disabled_at ${types.int8} NULL,
      ADD COLUMN IF NOT EXISTS token_version ${types.int4} NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_activity_at ${types.int8} NULL;

    /* Admin audit log table */
    CREATE TABLE IF NOT EXISTS ${ns}.admin_audit_log (
      id              ${types.string} NOT NULL DEFAULT gen_random_uuid()::TEXT,
      ts_ms           ${types.int8} NOT NULL DEFAULT current_epoch_ms(),
      admin_account   ${types.string} NOT NULL,
      target_account  ${types.string} NOT NULL,
      action          ${types.string} NOT NULL,
      workspace_uuid  ${types.string} NULL,
      details         JSONB NULL,
      PRIMARY KEY (id)
    );

    CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON ${ns}.admin_audit_log (target_account, ts_ms DESC);
    CREATE INDEX IF NOT EXISTS admin_audit_log_admin_idx  ON ${ns}.admin_audit_log (admin_account, ts_ms DESC);
    CREATE INDEX IF NOT EXISTS admin_audit_log_ts_idx     ON ${ns}.admin_audit_log (ts_ms DESC);
    `
    ],
    [
      'account_db_v28_admin_audit_log_relax_and_indexes',
      `
    ALTER TABLE ${ns}.admin_audit_log
      ALTER COLUMN target_account DROP NOT NULL;

    ALTER TABLE ${ns}.admin_audit_log
      ADD CONSTRAINT admin_audit_log_target_required_chk
      CHECK (target_account IS NOT NULL OR workspace_uuid IS NOT NULL);

    CREATE INDEX IF NOT EXISTS admin_audit_log_workspace_idx
      ON ${ns}.admin_audit_log (workspace_uuid, ts_ms DESC)
      WHERE workspace_uuid IS NOT NULL;

    CREATE INDEX IF NOT EXISTS account_disabled_at_idx
      ON ${ns}.account (disabled_at);

    CREATE INDEX IF NOT EXISTS account_last_activity_idx
      ON ${ns}.account (last_activity_at);

    CREATE INDEX IF NOT EXISTS social_id_person_verified_idx
      ON ${ns}.social_id (person_uuid)
      WHERE verified_on IS NOT NULL;

    CREATE INDEX IF NOT EXISTS workspace_members_account_idx
      ON ${ns}.workspace_members (account_uuid);
    `
    ],
    [
      'account_db_v29_admin_audit_log_batch_id',
      `
    ALTER TABLE ${ns}.admin_audit_log
      ADD COLUMN IF NOT EXISTS batch_id UUID NULL;
    `
    ],
    [
      'account_db_v30_admin_audit_log_batch_id_idx',
      `
    CREATE INDEX IF NOT EXISTS admin_audit_log_batch_id_idx
      ON ${ns}.admin_audit_log (batch_id) WHERE batch_id IS NOT NULL;
    `
    ]
  ]
}
