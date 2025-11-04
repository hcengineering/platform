use std::sync::Arc;

use lockable::LockPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct KeyMutex {
    lock_pool: Arc<LockPool<String>>,
}

impl KeyMutex {
    pub fn new() -> Self {
        let lock_pool = Arc::new(LockPool::<String>::new());

        KeyMutex { lock_pool }
    }

    pub async fn lock(&self, workspace: Uuid, key: String) -> impl Drop + '_ {
        self.lock_pool
            .async_lock(format!("{}:{}", workspace, key))
            .await
    }
}
