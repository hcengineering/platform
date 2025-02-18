CREATE TABLE IF NOT EXISTS communication.messages
(
    workspace_id UUID         NOT NULL,
    card_id      VARCHAR(255) NOT NULL,
    id           INT8         NOT NULL,

    content      TEXT         NOT NULL,
    creator      VARCHAR(255) NOT NULL,
    created      TIMESTAMPTZ  NOT NULL,

    PRIMARY KEY (id, card_id, workspace_id)
);


CREATE TABLE IF NOT EXISTS communication.messages_groups
(
    workspace_id UUID         NOT NULL,
    card_id      VARCHAR(255) NOT NULL,
    blob_id      UUID         NOT NULL,

    from_id      INT8         NOT NULL,
    to_id        INT8         NOT NULL,
    from_date    TIMESTAMPTZ  NOT NULL,
    to_date      TIMESTAMPTZ  NOT NULL,
    count        INT          NOT NULL,

    PRIMARY KEY (workspace_id, card_id, blob_id)
);
