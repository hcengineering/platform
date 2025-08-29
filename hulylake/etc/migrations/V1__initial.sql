create table blob(
    key text not null, 
    hash text not null
);

create unique index blob_key on blob(key);
create unique index blob_hash on blob(hash);


create table object(
    workspace uuid not null,
    key text not null,
    part smallint not null,
    data jsonb not null,
    inline bytea,

    primary key (workspace, key, part)
)