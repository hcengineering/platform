DROP TABLE IF EXISTS c_notification_context CASCADE;
CREATE TABLE IF NOT EXISTS c_notification_context
(
    id                 UUID NOT NULL DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL,
    card_id            UUID NOT NULL,

    personal_workspace UUID NOT NULL,

    archived_from      TIMESTAMPTZ,
    last_view          TIMESTAMPTZ,
    last_update        TIMESTAMPTZ,

    PRIMARY KEY (id),
    UNIQUE (workspace_id, card_id, personal_workspace)
);
