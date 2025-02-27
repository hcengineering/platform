CREATE TABLE IF NOT EXISTS communication.messages
(
    workspace_id UUID         NOT NULL,
    card_id      VARCHAR(255) NOT NULL,
    id           INT8         NOT NULL,

    content      TEXT         NOT NULL,
    creator      VARCHAR(255) NOT NULL,
    created      TIMESTAMPTZ  NOT NULL,

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
    from_id      INT8         NOT NULL,
    to_id        INT8         NOT NULL,
    count        INT          NOT NULL,

    PRIMARY KEY (workspace_id, card_id, blob_id)
);


CREATE INDEX IF NOT EXISTS idx_messages_groups_workspace_card ON communication.messages_groups (workspace_id, card_id);