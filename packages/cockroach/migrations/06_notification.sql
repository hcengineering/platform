DROP TABLE IF EXISTS c_notification CASCADE;
CREATE TABLE IF NOT EXISTS c_notification
(
    message_id UUID NOT NULL,
    context    UUID NOT NULL,

    PRIMARY KEY (message_id, context),
    FOREIGN KEY (message_id) REFERENCES c_message (id) ON DELETE CASCADE,
    FOREIGN KEY (context) REFERENCES c_notification_context (id) ON DELETE CASCADE
);
