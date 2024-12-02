CREATE TABLE IF NOT EXISTS notification_context
(
    workspace_id          UUID         NOT NULL,
    card_id               UUID         NOT NULL,
    huly_id               VARCHAR(255) NOT NULL, /* Or maybe account id or something else */

    last_view_timestamp   TIMESTAMP,
    last_update_timestamp TIMESTAMP,

    PRIMARY KEY (workspace_id, card_id, huly_id)
);
