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

export function getMigrations (): [string, string][] {
  return [migrationV1(), migrationV2(), migrationV3()]
}

function migrationV1 (): [string, string] {
  const sql = `
    CREATE TABLE IF NOT EXISTS billing.livekit_session (
      workspace STRING(255) NOT NULL,
      session_id STRING(255) NOT NULL,
      session_start TIMESTAMP NOT NULL,
      session_end TIMESTAMP NOT NULL,
      room STRING(255) NOT NULL,
      bandwidth INT8 NOT NULL DEFAULT 0,
      minutes INT8 NOT NULL,
      CONSTRAINT pk_livekit_session PRIMARY KEY (workspace, session_id)
    );

    CREATE INDEX IF NOT EXISTS idx_livekit_session_start ON billing.livekit_session (session_start);
    CREATE INDEX IF NOT EXISTS idx_livekit_session_end ON billing.livekit_session (session_end);
    CREATE INDEX IF NOT EXISTS idx_livekit_session_room ON billing.livekit_session (room);

    CREATE TABLE IF NOT EXISTS billing.livekit_egress (
      workspace STRING(255) NOT NULL,
      egress_id STRING(255) NOT NULL,
      egress_start TIMESTAMP NOT NULL,
      egress_end TIMESTAMP NOT NULL,
      room STRING(255) NOT NULL,
      duration INT NOT NULL,
      CONSTRAINT pk_livekit_egress PRIMARY KEY (workspace, egress_id)
    );

    CREATE INDEX IF NOT EXISTS idx_livekit_egress_start ON billing.livekit_egress (egress_start);
    CREATE INDEX IF NOT EXISTS idx_livekit_egress_end ON billing.livekit_egress (egress_end);
    CREATE INDEX IF NOT EXISTS idx_livekit_egress_room ON billing.livekit_egress (room);
  `
  return ['init_tables_01', sql]
}

function migrationV2 (): [string, string] {
  const sql = `
    CREATE TABLE IF NOT EXISTS billing.ai_transcript_usage (
                                                         workspace UUID NOT NULL,
                                                         day DATE NOT NULL,
                                                         last_request_id STRING(255) NOT NULL,
                                                         last_start_time TIMESTAMP NOT NULL,
                                                         total_duration_seconds FLOAT NOT NULL,
                                                         total_usd DECIMAL(12,6) NOT NULL,
                                                         PRIMARY KEY (workspace, day)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_transcript_usage_day ON billing.ai_transcript_usage (day);

    CREATE TABLE IF NOT EXISTS billing.ai_tokens_usage (
                                                             workspace UUID NOT NULL,
                                                             day DATE NOT NULL,
                                                             reason STRING(255) NOT NULL,
                                                             total_tokens INT8 NOT NULL,
                                                             PRIMARY KEY (workspace, day, reason)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_tokens_usage_day ON billing.ai_transcript_usage (day);
  `
  return ['init_ai_usage_tables_02', sql]
}

function migrationV3 (): [string, string] {
  const sql = `
    UPDATE billing.livekit_session SET bandwidth = 0 WHERE bandwidth IS NULL;
    ALTER TABLE billing.livekit_session ALTER COLUMN bandwidth SET DEFAULT 0;
  `
  return ['fix_bandwidth_nulls_03', sql]
}
