create table blob(
    key text not null, 
    hash text not null
);

create unique index blob_key on blob(key);
create unique index blob_hash on blob(hash);


create table object(
    workspace uuid not null,
    key text not null,
    part int not null,
    data jsonb not null,

    primary key (workspace, key, part)
)