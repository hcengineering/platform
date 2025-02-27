CREATE TABLE IF NOT EXISTS communication.notification_context
(
    id                 UUID         NOT NULL DEFAULT gen_random_uuid(),
    workspace_id       UUID         NOT NULL,
    card_id            VARCHAR(255) NOT NULL,

    personal_workspace UUID         NOT NULL,

    archived_from      TIMESTAMPTZ,
    last_view          TIMESTAMPTZ,
    last_update        TIMESTAMPTZ,

    PRIMARY KEY (id),
    UNIQUE (workspace_id, card_id, personal_workspace)
);


CREATE TABLE IF NOT EXISTS communication.notifications
(
    message_id UUID NOT NULL,
    context    UUID NOT NULL,

    PRIMARY KEY (message_id, context),
    FOREIGN KEY (context) REFERENCES communication.notification_context (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notification_context_idx ON communication.notifications (context);