CREATE TABLE IF NOT EXISTS communication.reactions
(
    workspace_id UUID         NOT NULL,
    card_id      VARCHAR(255) NOT NULL,
    message_id   INT8         NOT NULL,
    reaction     VARCHAR(100) NOT NULL,
    creator      VARCHAR(255) NOT NULL,
    created      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    FOREIGN KEY (workspace_id, card_id, message_id) REFERENCES communication.messages (workspace_id, card_id, id) ON DELETE CASCADE,
    PRIMARY KEY (workspace_id, card_id, message_id, creator, reaction)
);

CREATE INDEX IF NOT EXISTS idx_reactions_workspace_card_message ON communication.reactions (workspace_id, card_id, message_id);