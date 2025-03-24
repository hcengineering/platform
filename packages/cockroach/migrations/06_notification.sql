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