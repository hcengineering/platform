use hulyrs::services::jwt::Claims;
use uuid::Uuid;
use actix_web::{ Error, HttpMessage, HttpRequest, error };


/// Checking workspace in Authorization
pub fn workspace_owner(req: &HttpRequest) -> Result<(), Error> {
    let extensions = req.extensions();

    let claims = extensions
        .get::<Claims>()
        .ok_or_else(|| error::ErrorUnauthorized("Missing auth claims"))?;

    // is_system - allowed to all
    if claims.is_system() {
        return Ok(());
    }

    // else - check workplace
    let jwt_workspace = claims
        .workspace
        .as_ref()
        .ok_or_else(|| error::ErrorForbidden("Missing workspace in token"))?;

    let path_ws = req
        .match_info()
        .get("workspace")
        .ok_or_else(|| error::ErrorBadRequest("Missing workspace in URL path"))?;

    let path_ws_uuid =
        Uuid::parse_str(path_ws).map_err(|_| error::ErrorBadRequest("Invalid workspace UUID"))?;

    if jwt_workspace != &path_ws_uuid {
        return Err(error::ErrorForbidden("Workspace mismatch"));
    }

    Ok(())
}

