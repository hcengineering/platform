use crate::config::{CONFIG, RedisMode};

use std::time::{SystemTime, UNIX_EPOCH};

pub enum Ttl {
    Sec(usize), // EX
    At(u64),   // EXAT (timestamp in seconds)
}

#[derive(Debug)]
pub enum SaveMode {
    Upsert, // default: set or overwrite
    Insert, // only if not exists (NX)
    Update, // only if exists (XX)
    Equal(String), // only if md5 matches provided
}

use redis::{
    AsyncCommands, RedisResult,
    ToRedisArgs,
    Client, ConnectionInfo, ProtocolVersion, RedisConnectionInfo, aio::MultiplexedConnection };
use url::Url;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct RedisArray {
    pub workspace: String,
    pub key: String,
    pub data: String,
    pub expires_at: u64, // sec to expire TTL
    pub etag: String, // md5 hash (data)
}

fn error<T>(code: u16, msg: impl Into<String>) -> redis::RedisResult<T> {
    let msg = msg.into();
    let full = format!("{}: {}", code, msg);
    Err(redis::RedisError::from(( redis::ErrorKind::ExtensionError, "", full )))
}

/// redis_list(&connection,workspace,prefix)
pub async fn redis_list(
    conn: &mut MultiplexedConnection,
    workspace: &str,
    prefix: Option<&str>,
) -> redis::RedisResult<Vec<RedisArray>> {
    let mut cursor = 0;
    let mut results = Vec::new();
    let pattern = prefix.map(|p| format!("{}*", p));

    loop {
        let mut cmd = redis::cmd("HSCAN");
        cmd.arg(workspace).arg(cursor);
        if let Some(ref p) = pattern {
            cmd.arg("MATCH").arg(p);
        }
        // cmd.arg("COUNT").arg(100);

        let (next_cursor, items): (u64, Vec<(String, String)>) = cmd.query_async(conn).await?;

        for (key, value) in items {
            // TTL
            let ttl_vec: Vec<i64> = redis::cmd("HTTL")
                .arg(workspace)
                .arg("FIELDS")
                .arg(1)
                .arg(&key)
                .query_async(conn)
                .await?;

            let ttl = ttl_vec.get(0).copied().unwrap_or(-3);

            if ttl >= 0 {
                results.push(RedisArray {
                    workspace: workspace.to_string(),
                    key,
                    data: value.clone(),
                    expires_at: ttl as u64,
		    etag: hex::encode(md5::compute(&value).0),
                });
            }
        }

        if next_cursor == 0 { break; }
        cursor = next_cursor;
    }

    Ok(results)
}


/// redis_read(&connection,workspace,key)
#[allow(dead_code)]
pub async fn redis_read(
    conn: &mut MultiplexedConnection,
    workspace: &str,
    key: &str,
) -> redis::RedisResult<Option<RedisArray>> {

    let data: Option<String> = redis::cmd("HGET").arg(workspace).arg(key).query_async(conn).await?;
    let Some(data) = data else { return Ok(None); };

    let ttl_vec: Vec<i64> = redis::cmd("HTTL").arg(workspace).arg("FIELDS").arg(1).arg(key).query_async(conn).await?;
    let ttl = ttl_vec.get(0).copied().unwrap_or(-3); // -3 unknown error

    if ttl == -1 { return error(500, "TTL not set"); }
    if ttl == -2 { return error(500, "Key not found"); }
    if ttl < 0 { return error(500, "Unknown TTL error"); }

    Ok(Some(RedisArray {
        workspace: workspace.to_string(),
        key: key.to_string(),
        data: data.clone(),
	expires_at: ttl as u64,
        etag: hex::encode(md5::compute(&data).0),
    }))
}


/// TTL sec
/// redis_save(&mut conn, "workspace", "key", "val", Some(Ttl::Sec(300)), Some(SaveMode::Insert)).await?;
///
/// TTL at
/// let at_unixtime: u64 = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() + 600;
/// redis_save(&mut conn, "workspace", "key", "val", Some(Ttl::At(at_unixtime)), Some(SaveMode::Update)).await?;
///
/// w/o TTL (CONFIG.max_ttl)
/// redis_save(&mut conn, "workspace", "key", "val", None, None).await?;

#[allow(dead_code)]
pub async fn redis_save<T: ToRedisArgs>(
    conn: &mut MultiplexedConnection,
    workspace: &str,
    key: &str,
    value: T,
    ttl: Option<Ttl>,
    mode: Option<SaveMode>,
) -> RedisResult<()> {

    // TTL logic
    let sec = match ttl {
	Some(Ttl::Sec(secs)) => secs,
	Some(Ttl::At(timestamp)) => {
    	    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    	    if timestamp <= now {
        	return error(400, "TTL timestamp exceeds MAX_TTL limit");
    	    }
    	    (timestamp - now) as usize
	}
	None => CONFIG.max_ttl,
    };
    if sec == 0 { return error(400, "TTL must be > 0"); }
    if sec > CONFIG.max_ttl { return error(412, "TTL exceeds MAX_TTL"); }

    let mut cmd = redis::cmd("HSET");
    cmd.arg(workspace).arg(key).arg(value);

    // Mode variants
    match mode.unwrap_or(SaveMode::Upsert) {

        SaveMode::Upsert => {} // none

        SaveMode::Insert => {
	    let exists: bool = redis::cmd("HEXISTS").arg(workspace).arg(key).query_async(conn).await?;
	    if exists { return error(412, "Insert: key already exists"); }
	}

        SaveMode::Update => {
	    let exists: bool = redis::cmd("HEXISTS").arg(workspace).arg(key).query_async(conn).await?;
	    if !exists { return error(404, "Update: key does not exist"); }
	}

        SaveMode::Equal(md5) => {
	    let current_value: Option<String> = redis::cmd("HGET").arg(workspace).arg(key).query_async(conn).await?;
    	    if let Some(existing) = current_value {
    		let actual_md5 = hex::encode(md5::compute(&existing).0);
    		if actual_md5 != md5 { return error(412, format!("md5 mismatch, current: {} expected: {}", actual_md5, md5)); }
	    } else { return error(404, "Equal: key does not exist"); }
        }

    }

    // 1) HSET execute
    cmd.query_async::<i64>(&mut *conn).await?;

    // 2) HEXPIRE execute
    let res: Vec<i32> = redis::cmd("HEXPIRE").arg(workspace).arg(sec).arg("FIELDS").arg(1).arg(key).query_async(&mut *conn).await?;
    if res.get(0).copied().unwrap_or(0) == 0 {
	return error(404, "HEXPIRE field not found or TTL not set");
    }

    Ok(())
}


/// redis_delete(&connection,workspace,key)
#[allow(dead_code)]
pub async fn redis_delete(
    conn: &mut MultiplexedConnection,
    workspace: &str,
    key: &str,
) -> redis::RedisResult<bool> {

    let deleted: i32 = redis::cmd("HDEL")
        .arg(workspace)
        .arg(key)
        .query_async(conn)
        .await?;

    Ok(deleted > 0)
}


/// redis_connect()
pub async fn redis_connect() -> anyhow::Result<MultiplexedConnection> {
    let default_port = match CONFIG.redis_mode {
        RedisMode::Sentinel => 6379,
        RedisMode::Direct => 6380,
    };

    let urls = CONFIG
        .redis_urls
        .iter()
        .map(|url| {
            redis::ConnectionAddr::Tcp(
                url.host().unwrap().to_string(),
                url.port().unwrap_or(default_port),
            )
        })
        .collect::<Vec<_>>();

    let conn = if CONFIG.redis_mode == RedisMode::Sentinel {
        use redis::sentinel::{SentinelClientBuilder, SentinelServerType};

        let mut sentinel = SentinelClientBuilder::new(
            urls,
            CONFIG.redis_service.to_owned(),
            SentinelServerType::Master,
        )
        .unwrap()
        .set_client_to_redis_protocol(ProtocolVersion::RESP3)
        .set_client_to_redis_db(0)
        .set_client_to_redis_password(CONFIG.redis_password.clone())
        .set_client_to_sentinel_password(CONFIG.redis_password.clone())
        .build()?;

        sentinel.get_async_connection().await?
    } else {
        let single = urls
            .first()
            .ok_or_else(|| anyhow::anyhow!("No redis URL provided"))?;

        let redis_connection_info = RedisConnectionInfo {
            db: 0,
            username: None,
            password: Some(CONFIG.redis_password.clone()),
            protocol: ProtocolVersion::RESP3,
        };

        let connection_info = ConnectionInfo {
            addr: single.clone(),
            redis: redis_connection_info,
        };

        let client = Client::open(connection_info)?;
        client.get_multiplexed_async_connection().await?
    };

    Ok(conn)
}
