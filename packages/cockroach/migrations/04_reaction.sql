CREATE TABLE IF NOT EXISTS reaction
(
    message_id UUID         NOT NULL,
    reaction   VARCHAR(100)      NOT NULL,
    creator    VARCHAR(255) NOT NULL,
    created    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    PRIMARY KEY (message_id, creator, reaction),
    FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS reaction_message_idx ON reaction (message_id);
