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

use actix_web::{HttpMessage, HttpRequest};
use hulyrs::services::jwt::Claims;
use uuid::Uuid;

// common checker
pub fn check_workspace_core(claims: &Claims, key: &str) -> Result<(), &'static str> {
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

/// HTTP API
pub fn workspace_check(req: &HttpRequest) -> Result<(), actix_web::Error> {
    let key = req
        .match_info()
        .get("key")
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Missing key in URL path"))?;
    let claims = req
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing auth claims"))?;

    match check_workspace_core(&claims, key) {
        Ok(()) => Ok(()),
        Err(msg) => Err(actix_web::error::ErrorUnauthorized(msg)),
    }
}
