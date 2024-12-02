CREATE TABLE IF NOT EXISTS message
(
    id      INT8         NOT NULL DEFAULT unique_rowid(),
    content TEXT,
    version INTEGER      NOT NULL,
    creator VARCHAR(255) NOT NULL,
    created TIMESTAMP    NOT NULL,

    PRIMARY KEY (id, version)
);

CREATE TABLE IF NOT EXISTS message_place
(
    workspace_id UUID NOT NULL,
    card_id      UUID NOT NULL,
    message_id   INT8 NOT NULL,

    PRIMARY KEY (workspace_id, card_id, message_id)
);