CREATE TABLE IF NOT EXISTS communication.patch
(
    id           INT8         NOT NULL DEFAULT unique_rowid(),
    workspace_id UUID         NOT NULL,
    card_id      VARCHAR(255) NOT NULL,
    message_id   INT8         NOT NULL,
    content      TEXT         NOT NULL,
    creator      VARCHAR(255) NOT NULL,
    created      TIMESTAMPTZ  NOT NULL,

    PRIMARY KEY (id)
);

CREATE INDEX idx_patch_message_id ON communication.patch (message_id);