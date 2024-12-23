CREATE TABLE IF NOT EXISTS message
(
    id      UUID         NOT NULL DEFAULT gen_random_uuid(),
    content TEXT         NOT NULL,
    creator VARCHAR(255) NOT NULL,
    created TIMESTAMPTZ  NOT NULL,

    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS message_place
(
    workspace_id UUID NOT NULL,
    card_id      UUID NOT NULL,
    message_id   UUID NOT NULL,

    PRIMARY KEY (workspace_id, card_id, message_id),
    FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE
);



CREATE INDEX idx_message_place_workspace_card ON message_place (workspace_id, card_id);
CREATE INDEX idx_message_place_message_id ON message_place (message_id);
