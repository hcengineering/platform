CREATE TABLE IF NOT EXISTS notification
(
    social_id  VARCHAR(255) NOT NULL,
    message_id INT8         NOT NULL,

    read       BOOLEAN      NOT NULL DEFAULT false,
    archived   BOOLEAN      NOT NULL DEFAULT false,

    PRIMARY KEY (social_id, message_id)
);