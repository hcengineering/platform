use std::collections::HashSet;
use std::sync::Arc;

use size::Size;
use tokio::sync::{RwLock, mpsc};
use tracing::*;
use uuid::Uuid;

use crate::config::CONFIG;
use crate::handlers::{ApiError, PartData};
use crate::merge;
use crate::mutex::KeyMutex;
use crate::postgres::{ObjectPart, Pool};
use crate::s3::S3Client;
use crate::{blob, postgres, recovery};

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub struct CompactTask {
    pub workspace: Uuid,
    pub key: String,
}

pub struct CompactWorker {
    ingest_tx: mpsc::Sender<CompactTask>,
    ingest_handle: Arc<tokio::task::JoinHandle<()>>,
    compact_handle: Arc<tokio::task::JoinHandle<()>>,
}

impl Clone for CompactWorker {
    fn clone(&self) -> Self {
        CompactWorker {
            ingest_tx: self.ingest_tx.clone(),
            ingest_handle: self.ingest_handle.clone(),
            compact_handle: self.compact_handle.clone(),
        }
    }
}

impl CompactWorker {
    pub fn new(s3: Arc<S3Client>, pool: Pool, lock: KeyMutex, buffer_size: usize) -> Self {
        let (ingest_tx, ingest_rx) = mpsc::channel(buffer_size);
        let (compact_tx, compact_rx) = mpsc::channel(buffer_size);

        let pending_tasks = Arc::new(RwLock::new(HashSet::new()));
        let pending_tasks_ingest = pending_tasks.clone();
        let pending_tasks_compact = pending_tasks.clone();

        let ingest_handle = tokio::spawn(async move {
            debug!(buffer_size, "started ingest worker");
            Self::run_ingest_worker(ingest_rx, compact_tx, pending_tasks_ingest).await
        });

        let compact_handle = tokio::spawn(async move {
            debug!(buffer_size, "started compact worker");
            Self::run_compact_worker(
                compact_rx,
                s3.clone(),
                pool,
                lock.clone(),
                pending_tasks_compact,
            )
            .await;
        });

        Self {
            ingest_tx,
            ingest_handle: Arc::new(ingest_handle),
            compact_handle: Arc::new(compact_handle),
        }
    }

    async fn run_ingest_worker(
        mut ingest_rx: mpsc::Receiver<CompactTask>,
        compact_tx: mpsc::Sender<CompactTask>,
        pending_tasks: Arc<RwLock<HashSet<CompactTask>>>,
    ) {
        loop {
            while let Some(task) = ingest_rx.recv().await {
                let is_new = pending_tasks.write().await.insert(task.clone());
                if !is_new {
                    continue;
                }

                if let Err(err) = compact_tx.send(task.clone()).await {
                    error!(%err, "failed to send compact task");
                    pending_tasks.write().await.remove(&task);
                }
            }
        }
    }

    async fn run_compact_worker(
        mut rx: mpsc::Receiver<CompactTask>,
        s3: Arc<S3Client>,
        pool: Pool,
        lock: KeyMutex,
        pending_tasks: Arc<RwLock<HashSet<CompactTask>>>,
    ) {
        loop {
            while let Some(task) = rx.recv().await {
                let CompactTask { workspace, key } = task.clone();

                let _guard = lock.lock(workspace, key).await;

                pending_tasks.write().await.remove(&task);

                let res = compact(s3.clone(), pool.clone(), task.clone()).await;
                match res {
                    Ok(_) => debug!(workspace = %task.workspace, key = %task.key, "blob compacted"),
                    Err(err) => error!(%err, "failed to compact"),
                }
            }
        }
    }

    pub async fn send(&self, parts: &Vec<ObjectPart<PartData>>) {
        if parts.len() > CONFIG.compact_parts_limit {
            let task = CompactTask {
                workspace: parts[0].data.workspace,
                key: parts[0].data.key.clone(),
            };

            let res = self.ingest_tx.send(task.clone()).await;
            if let Err(err) = res {
                warn!(%err, "failed to schedule compact");
            }
        }
    }

    pub async fn stop(&self) {
        self.ingest_handle.abort();
        self.compact_handle.abort();
    }
}

#[instrument(level = "debug", skip_all, fields(workspace, huly_key))]
async fn compact(s3: Arc<S3Client>, pool: Pool, task: CompactTask) -> anyhow::Result<(), ApiError> {
    let pool = pool.clone();

    let workspace = task.workspace;
    let key = task.key;

    Span::current()
        .record("workspace", workspace.to_string())
        .record("huly_key", &key);

    let parts = postgres::find_parts(&pool, task.workspace, &key).await?;
    let first = &parts.first().unwrap().data;
    let last = &parts.last().unwrap().data;

    let stream = merge::stream(s3.clone(), parts.to_vec()).await?;

    let uploaded = blob::upload(
        &s3,
        &pool,
        Size::from_bytes(stream.content_length),
        stream.stream,
    )
    .await?;

    let inline = uploaded.inline.and_then(|inline| {
        if inline.len() < CONFIG.inline_threshold.bytes() as usize {
            Some(inline)
        } else {
            None
        }
    });

    let part_data = PartData {
        workspace,
        key: key.to_owned(),
        part: 0,
        blob: uploaded.s3_key,
        size: uploaded.length,
        etag: last.etag.clone(),
        date: last.date.clone(),

        headers: first.headers.clone(),
        meta: first.meta.clone(),
        merge_strategy: first.merge_strategy,
    };
    let obj_parts = vec![&part_data];

    postgres::set_part(&pool, workspace, &key, inline, &part_data).await?;
    recovery::set_object(&s3, workspace, &key, obj_parts, None).await?;

    Ok(())
}
