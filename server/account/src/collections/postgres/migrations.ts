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

export function getMigrations (ns: string): [string, string][] {
  return [
    getV1Migration(ns),
    getV2Migration1(ns),
    getV2Migration2(ns),
    getV2Migration3(ns),
    getV3Migration(ns),
    getV4Migration(ns),
    getV4Migration1(ns),
    getV5Migration(ns),
    getV6Migration(ns),
    getV7Migration(ns),
    getV8Migration(ns),
    getV9Migration(ns),
    getV10Migration1(ns),
    getV10Migration2(ns),
    getV11Migration(ns),
    getV12Migration(ns),
    getV13Migration(ns),
    getV14Migration(ns),
    getV15Migration(ns),
    getV16Migration(ns)
  ]
}

// NOTE: NEVER MODIFY EXISTING MIGRATIONS. IF YOU NEED TO ADJUST THE SCHEMA, ADD A NEW MIGRATION.
function getV1Migration (ns: string): [string, string] {
  return [
    'account_db_v1_global_init',
    `
    /* ======= FUNCTIONS ======= */

    CREATE OR REPLACE FUNCTION current_epoch_ms() 
    RETURNS BIGINT AS $$
        SELECT (extract(epoch from current_timestamp) * 1000)::bigint;
    $$ LANGUAGE SQL;

    /* ======= T Y P E S ======= */
    CREATE TYPE IF NOT EXISTS ${ns}.social_id_type AS ENUM ('email', 'github', 'google', 'phone', 'oidc', 'huly', 'telegram');
    CREATE TYPE IF NOT EXISTS ${ns}.location AS ENUM ('kv', 'weur', 'eeur', 'wnam', 'enam', 'apac');
    CREATE TYPE IF NOT EXISTS ${ns}.workspace_role AS ENUM ('OWNER', 'MAINTAINER', 'USER', 'GUEST', 'DOCGUEST');

    /* ======= P E R S O N ======= */
    CREATE TABLE IF NOT EXISTS ${ns}.person (
        uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        first_name STRING NOT NULL,
        last_name STRING NOT NULL,
        country STRING,
        city STRING,
        CONSTRAINT person_pk PRIMARY KEY (uuid)
    );

    /* ======= A C C O U N T ======= */
    CREATE TABLE IF NOT EXISTS ${ns}.account (
        uuid UUID NOT NULL,
        timezone STRING,
        locale STRING,
        CONSTRAINT account_pk PRIMARY KEY (uuid),
        CONSTRAINT account_person_fk FOREIGN KEY (uuid) REFERENCES ${ns}.person(uuid)
    );

    CREATE TABLE IF NOT EXISTS ${ns}.account_passwords (
        account_uuid UUID NOT NULL,
        hash BYTES NOT NULL,
        salt BYTES NOT NULL,
        CONSTRAINT account_auth_pk PRIMARY KEY (account_uuid),
        CONSTRAINT account_passwords_account_fk FOREIGN KEY (account_uuid) REFERENCES ${ns}.account(uuid)
    );

    CREATE TABLE IF NOT EXISTS ${ns}.account_events (
        account_uuid UUID NOT NULL,
        event_type STRING NOT NULL,
        time BIGINT NOT NULL DEFAULT current_epoch_ms(),
        data JSONB,
        CONSTRAINT account_events_pk PRIMARY KEY (account_uuid, event_type, time),
        CONSTRAINT account_events_account_fk FOREIGN KEY (account_uuid) REFERENCES ${ns}.account(uuid)
    );

    /* ======= S O C I A L   I D S ======= */
    CREATE TABLE IF NOT EXISTS ${ns}.social_id (
        type ${ns}.social_id_type NOT NULL,
        value STRING NOT NULL,
        key STRING AS (CONCAT(type::STRING, ':', value)) STORED,
        person_uuid UUID NOT NULL,
        created_on BIGINT NOT NULL DEFAULT current_epoch_ms(),
        verified_on BIGINT,
        CONSTRAINT social_id_pk PRIMARY KEY (type, value),
        CONSTRAINT social_id_key_unique UNIQUE (key),
        INDEX social_id_account_idx (person_uuid),
        CONSTRAINT social_id_person_fk FOREIGN KEY (person_uuid) REFERENCES ${ns}.person(uuid)
    );

    /* ======= W O R K S P A C E ======= */
    CREATE TABLE IF NOT EXISTS ${ns}.workspace (
        uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        name STRING NOT NULL,
        url STRING NOT NULL,
        data_id STRING,
        branding STRING,
        location ${ns}.location,
        region STRING,
        created_by UUID, -- account uuid
        created_on BIGINT NOT NULL DEFAULT current_epoch_ms(),
        billing_account UUID,
        CONSTRAINT workspace_pk PRIMARY KEY (uuid),
        CONSTRAINT workspace_url_unique UNIQUE (url),
        CONSTRAINT workspace_created_by_fk FOREIGN KEY (created_by) REFERENCES ${ns}.account(uuid),
        CONSTRAINT workspace_billing_account_fk FOREIGN KEY (billing_account) REFERENCES ${ns}.account(uuid)
    );

    CREATE TABLE IF NOT EXISTS ${ns}.workspace_status (
        workspace_uuid UUID NOT NULL,
        mode STRING,
        processing_progress INT2 DEFAULT 0,
        version_major INT2 NOT NULL DEFAULT 0,
        version_minor INT2 NOT NULL DEFAULT 0,
        version_patch INT4 NOT NULL DEFAULT 0,
        last_processing_time BIGINT DEFAULT 0,
        last_visit BIGINT,
        is_disabled BOOL DEFAULT FALSE,
        processing_attempts INT2 DEFAULT 0,
        processing_message STRING,
        backup_info JSONB,
        CONSTRAINT workspace_status_pk PRIMARY KEY (workspace_uuid),
        CONSTRAINT workspace_status_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES ${ns}.workspace(uuid)
    );

    CREATE TABLE IF NOT EXISTS ${ns}.workspace_members (
        workspace_uuid UUID NOT NULL,
        account_uuid UUID NOT NULL,
        role ${ns}.workspace_role NOT NULL DEFAULT 'USER',
        CONSTRAINT workspace_assignment_pk PRIMARY KEY (workspace_uuid, account_uuid),
        CONSTRAINT members_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES ${ns}.workspace(uuid),
        CONSTRAINT members_account_fk FOREIGN KEY (account_uuid) REFERENCES ${ns}.account(uuid)
    );

    /* ========================================================================================== */
    /* MAIN SCHEMA ENDS HERE */
    /* ===================== */

    /* ======= O T P ======= */
    CREATE TABLE IF NOT EXISTS ${ns}.otp (
        social_id STRING NOT NULL,
        code STRING NOT NULL,
        expires_on BIGINT NOT NULL,
        created_on BIGINT NOT NULL DEFAULT current_epoch_ms(),
        CONSTRAINT otp_pk PRIMARY KEY (social_id, code),
        CONSTRAINT otp_social_id_fk FOREIGN KEY (social_id) REFERENCES ${ns}.social_id(key)
    );

    /* ======= I N V I T E ======= */
    CREATE TABLE IF NOT EXISTS ${ns}.invite (
        id INT8 NOT NULL DEFAULT unique_rowid(),
        workspace_uuid UUID NOT NULL,
        expires_on BIGINT NOT NULL,
        email_pattern STRING,
        remaining_uses INT2,
        role ${ns}.workspace_role NOT NULL DEFAULT 'USER',
        migrated_from STRING,
        CONSTRAINT invite_pk PRIMARY KEY (id),
        INDEX workspace_invite_idx (workspace_uuid),
        INDEX migrated_from_idx (migrated_from),
        CONSTRAINT invite_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES ${ns}.workspace(uuid)
    );
`
  ]
}

function getV2Migration1 (ns: string): [string, string] {
  return [
    'account_db_v2_social_id_id_add',
    `
    -- Add _id column to social_id table
    ALTER TABLE ${ns}.social_id
    ADD COLUMN IF NOT EXISTS _id INT8 NOT NULL DEFAULT unique_rowid();
    `
  ]
}

function getV2Migration2 (ns: string): [string, string] {
  return [
    'account_db_v2_social_id_pk_change',
    `
    -- Drop existing otp foreign key constraint
    ALTER TABLE ${ns}.otp
    DROP CONSTRAINT IF EXISTS otp_social_id_fk;

    -- Drop existing primary key on social_id
    ALTER TABLE ${ns}.social_id
    DROP CONSTRAINT IF EXISTS social_id_pk;

    -- Add new primary key on _id
    ALTER TABLE ${ns}.social_id
    ADD CONSTRAINT social_id_pk PRIMARY KEY (_id);
    `
  ]
}

function getV2Migration3 (ns: string): [string, string] {
  return [
    'account_db_v2_social_id_constraints',
    `
    -- Add unique constraint on type, value
    ALTER TABLE ${ns}.social_id
    ADD CONSTRAINT social_id_tv_key_unique UNIQUE (type, value);

    -- Drop old table
    DROP TABLE ${ns}.otp;

    -- Create new OTP table with correct column type
    CREATE TABLE ${ns}.otp (
        social_id INT8 NOT NULL,
        code STRING NOT NULL,
        expires_on BIGINT NOT NULL,
        created_on BIGINT NOT NULL DEFAULT current_epoch_ms(),
        CONSTRAINT otp_new_pk PRIMARY KEY (social_id, code),
        CONSTRAINT otp_new_social_id_fk FOREIGN KEY (social_id) REFERENCES ${ns}.social_id(_id)
    );
    `
  ]
}

function getV3Migration (ns: string): [string, string] {
  return [
    'account_db_v3_add_invite_auto_join_final',
    `
    ALTER TABLE ${ns}.invite
    ADD COLUMN IF NOT EXISTS email STRING,
    ADD COLUMN IF NOT EXISTS auto_join BOOL DEFAULT FALSE;

    ALTER TABLE ${ns}.account
    ADD COLUMN IF NOT EXISTS automatic BOOL;
    `
  ]
}

function getV4Migration (ns: string): [string, string] {
  return [
    'account_db_v4_mailbox',
    `
    CREATE TABLE IF NOT EXISTS ${ns}.mailbox (
        account_uuid UUID NOT NULL,
        mailbox STRING NOT NULL,
        CONSTRAINT mailbox_pk PRIMARY KEY (mailbox),
        CONSTRAINT mailbox_account_fk FOREIGN KEY (account_uuid) REFERENCES ${ns}.account(uuid)
    );

    CREATE TABLE IF NOT EXISTS ${ns}.mailbox_secrets (
        mailbox STRING NOT NULL,
        app STRING,
        secret STRING NOT NULL,
        CONSTRAINT mailbox_secret_mailbox_fk FOREIGN KEY (mailbox) REFERENCES ${ns}.mailbox(mailbox)
    );
      `
  ]
}

function getV4Migration1 (ns: string): [string, string] {
  return [
    'account_db_v4_remove_mailbox_account_fk',
    `
    ALTER TABLE ${ns}.mailbox
    DROP CONSTRAINT IF EXISTS mailbox_account_fk;
    `
  ]
}

function getV5Migration (ns: string): [string, string] {
  return [
    'account_db_v5_social_id_is_deleted',
    `
    ALTER TABLE ${ns}.social_id
    ADD COLUMN IF NOT EXISTS is_deleted BOOL NOT NULL DEFAULT FALSE;
    `
  ]
}

function getV6Migration (ns: string): [string, string] {
  return [
    'account_db_v6_add_social_id_integrations',
    `
    CREATE TABLE IF NOT EXISTS ${ns}.integrations (
        social_id INT8 NOT NULL,
        kind STRING NOT NULL,
        workspace_uuid UUID,
        _def_ws_uuid UUID NOT NULL GENERATED ALWAYS AS (COALESCE(workspace_uuid, '00000000-0000-0000-0000-000000000000')) STORED NOT VISIBLE,
        data JSONB,
        CONSTRAINT integrations_pk PRIMARY KEY (social_id, kind, _def_ws_uuid),
        INDEX integrations_kind_idx (kind),
        CONSTRAINT integrations_social_id_fk FOREIGN KEY (social_id) REFERENCES ${ns}.social_id(_id),
        CONSTRAINT integrations_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES ${ns}.workspace(uuid)
    );

    CREATE TABLE IF NOT EXISTS ${ns}.integration_secrets (
        social_id INT8 NOT NULL,
        kind STRING NOT NULL,
        workspace_uuid UUID,
        _def_ws_uuid UUID NOT NULL GENERATED ALWAYS AS (COALESCE(workspace_uuid, '00000000-0000-0000-0000-000000000000')) STORED NOT VISIBLE,
        key STRING,
        secret STRING NOT NULL,
        CONSTRAINT integration_secrets_pk PRIMARY KEY (social_id, kind, _def_ws_uuid, key)
    );
    `
  ]
}

function getV7Migration (ns: string): [string, string] {
  return [
    'account_db_v7_add_display_value',
    `
    ALTER TABLE ${ns}.social_id
    ADD COLUMN IF NOT EXISTS display_value TEXT;
    `
  ]
}

function getV8Migration (ns: string): [string, string] {
  return [
    'account_db_v8_add_account_max_workspaces',
    `
    ALTER TABLE ${ns}.account
    ADD COLUMN IF NOT EXISTS max_workspaces SMALLINT;
    `
  ]
}

function getV9Migration (ns: string): [string, string] {
  return [
    'account_db_v9_add_migrated_to_person',
    `
    ALTER TABLE ${ns}.person
    ADD COLUMN IF NOT EXISTS migrated_to UUID,
    ADD CONSTRAINT person_migrated_to_fk FOREIGN KEY (migrated_to) REFERENCES ${ns}.person(uuid);
    `
  ]
}

function getV10Migration1 (ns: string): [string, string] {
  return [
    'account_db_v10_add_readonly_role',
    `
    ALTER TYPE ${ns}.workspace_role ADD VALUE 'READONLYGUEST' AFTER 'DOCGUEST';
    `
  ]
}

function getV10Migration2 (ns: string): [string, string] {
  return [
    'account_db_v10_add_allow_guests_flag_to_workspace',
    `
    ALTER TABLE ${ns}.workspace
    ADD COLUMN IF NOT EXISTS allow_read_only_guest BOOL NOT NULL DEFAULT FALSE;
    `
  ]
}

function getV11Migration (ns: string): [string, string] {
  return [
    'account_db_v10_add_migrated_to_person',
    `
    CREATE TABLE IF NOT EXISTS ${ns}._pending_workspace_lock (
      id INT8 DEFAULT 1 PRIMARY KEY,
      CONSTRAINT single_row CHECK (id = 1)
    );
    
    INSERT INTO ${ns}._pending_workspace_lock (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `
  ]
}

function getV12Migration (ns: string): [string, string] {
  return [
    'account_db_v12_update_account_events_fk',
    `
    -- Drop existing foreign key constraint
    ALTER TABLE ${ns}.account_events
    DROP CONSTRAINT IF EXISTS account_events_account_fk;

    -- Add new foreign key constraint referencing person table
    ALTER TABLE ${ns}.account_events
    ADD CONSTRAINT account_events_person_fk FOREIGN KEY (account_uuid) REFERENCES ${ns}.person(uuid);
    `
  ]
}

function getV13Migration (ns: string): [string, string] {
  return [
    'account_db_v13_update_workspace_fk_to_person',
    `
    -- Drop existing foreign key constraints
    ALTER TABLE ${ns}.workspace
    DROP CONSTRAINT IF EXISTS workspace_created_by_fk,
    DROP CONSTRAINT IF EXISTS workspace_billing_account_fk;

    -- Add new foreign key constraints referencing person table
    ALTER TABLE ${ns}.workspace
    ADD CONSTRAINT workspace_created_by_person_fk 
      FOREIGN KEY (created_by) REFERENCES ${ns}.person(uuid),
    ADD CONSTRAINT workspace_billing_account_person_fk 
      FOREIGN KEY (billing_account) REFERENCES ${ns}.person(uuid);
    `
  ]
}

function getV14Migration (ns: string): [string, string] {
  return [
    'account_db_v14_add_allow_guest_signup_flag_to_workspace',
    `
    ALTER TABLE ${ns}.workspace
    ADD COLUMN IF NOT EXISTS allow_guest_sign_up BOOL NOT NULL DEFAULT FALSE;
    `
  ]
}

function getV15Migration (ns: string): [string, string] {
  return [
    'account_db_v15_add_target_region_to_workspace_status',
    `
    ALTER TABLE ${ns}.workspace_status
    ADD COLUMN IF NOT EXISTS target_region STRING;
    `
  ]
}

function getV16Migration (ns: string): [string, string] {
  return [
    'account_db_v16_add_huly_assistant_social_id_type',
    `
    ALTER TYPE ${ns}.social_id_type ADD VALUE 'huly-assistant' AFTER 'telegram';
    `
  ]
}
