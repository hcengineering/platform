CREATE TABLE IF NOT EXISTS reaction
(
    message_id INT8         NOT NULL,
    reaction   INTEGER      NOT NULL,
    creator    VARCHAR(255) NOT NULL,
    created    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    PRIMARY KEY (message_id, creator, reaction)
);

CREATE INDEX IF NOT EXISTS reaction_message_idx ON reaction (message_id);
