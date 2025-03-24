CREATE TABLE IF NOT EXISTS communication.files
(
    workspace_id        UUID         NOT NULL,
    card_id             VARCHAR(255) NOT NULL,
    message_id          INT8         NOT NULL,

    blob_id             UUID         NOT NULL,
    filename            VARCHAR(255) NOT NULL,
    type                VARCHAR(255) NOT NULL,
    size                INT8         NOT NULL,

    creator             VARCHAR(255) NOT NULL,
    created             TIMESTAMPTZ  NOT NULL DEFAULT now(),

    message_created_sec TIMESTAMPTZ(0)  NOT NULL,

    PRIMARY KEY (workspace_id, card_id, message_id, blob_id)
);

CREATE INDEX IF NOT EXISTS files_workspace_card_message_idx ON communication.files (workspace_id, card_id, message_id);
