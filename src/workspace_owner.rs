//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

use hulyrs::services::jwt::Claims;
use uuid::Uuid;

use crate::{config::CONFIG, redis::deprecated_symbol};

// common checker
pub fn check_workspace_core(claims_opt: Option<Claims>, key: &str) -> Result<(), &'static str> {
    if deprecated_symbol(key) {
        return Err("Invalid key: deprecated symbols");
    }

    if CONFIG.no_authorization {
        return Ok(());
    }

    let claims = claims_opt.ok_or("Missing authorization")?;

    if claims.is_system() {
        return Ok(());
    }

    let jwt_workspace = claims
        .workspace
        .as_ref()
        .ok_or("Missing workspace in token")?;
    let path_ws = key
        .split('/')
        .next()
        .ok_or("Invalid key: missing workspace")?;
    if path_ws.is_empty() {
        return Err("Invalid key: missing workspace");
    }

    let path_ws_uuid = Uuid::parse_str(path_ws).map_err(|_| "Invalid workspace UUID in key")?;
    if jwt_workspace != &path_ws_uuid {
        return Err("Workspace mismatch");
    }

    Ok(())
}
