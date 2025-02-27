CREATE TABLE IF NOT EXISTS communication.patch
(
    id           INT8         NOT NULL DEFAULT unique_rowid(),
    workspace_id UUID         NOT NULL,
    card_id      VARCHAR(255) NOT NULL,
    message_id   INT8         NOT NULL,
    type         VARCHAR(255) NOT NULL,
    content      TEXT         NOT NULL,
    creator      VARCHAR(255) NOT NULL,
    created      TIMESTAMPTZ  NOT NULL,

    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_patch_workspace_card_message ON communication.patch (workspace_id, card_id, message_id);