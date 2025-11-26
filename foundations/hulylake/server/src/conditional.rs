use actix_web::HttpRequest;
use actix_web::http::header::EntityTag;
use actix_web::http::header::Header;
use actix_web::http::header::IfMatch;
use actix_web::http::header::IfNoneMatch;

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
pub enum ConditionalError {
    #[error("Invalid header")]
    ParseError,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ConditionalMatch {
    IfMatch(String),
    IfNoneMatch(String),
}

pub fn any_match(
    req: &HttpRequest,
    etag: Option<EntityTag>,
) -> Result<Option<bool>, ConditionalError> {
    match IfMatch::parse(req) {
        Ok(IfMatch::Any) => Ok(Some(etag.is_some())),
        Ok(IfMatch::Items(items)) => Ok({
            if items.is_empty() {
                None
            } else {
                Some(etag.map_or(false, |e| items.contains(&e)))
            }
        }),
        Err(_) => Err(ConditionalError::ParseError),
    }
}

pub fn none_match(
    req: &HttpRequest,
    etag: Option<EntityTag>,
) -> Result<Option<bool>, ConditionalError> {
    match IfNoneMatch::parse(req) {
        Ok(IfNoneMatch::Any) => Ok(Some(etag.is_none())),
        Ok(IfNoneMatch::Items(items)) => Ok({
            if items.is_empty() {
                None
            } else {
                Some(etag.map_or(true, |e| !items.contains(&e)))
            }
        }),
        Err(_) => Err(ConditionalError::ParseError),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test::TestRequest;

    #[test]
    fn test_any_match_none_some() {
        assert_eq!(
            any_match(
                &TestRequest::default().to_http_request(),
                Some(EntityTag::new_strong("foo".to_owned()))
            ),
            Ok(None)
        );
    }

    #[test]
    fn test_any_match_any_some() {
        assert_eq!(
            any_match(
                &TestRequest::default()
                    .insert_header(("If-Match", "*"))
                    .to_http_request(),
                Some(EntityTag::new_strong("foo".to_owned()))
            ),
            Ok(Some(true))
        );
    }

    #[test]
    fn test_any_match_some_some() {
        assert_eq!(
            any_match(
                &TestRequest::default()
                    .insert_header(("If-Match", "\"foo\" ,\"bar\""))
                    .to_http_request(),
                Some(EntityTag::new_strong("foo".to_owned()))
            ),
            Ok(Some(true))
        );
    }

    #[test]
    fn test_none_match_none_none() {
        assert_eq!(
            none_match(&TestRequest::default().to_http_request(), None),
            Ok(None)
        );
    }

    #[test]
    fn test_none_match_any_some() {
        assert_eq!(
            none_match(
                &TestRequest::default()
                    .insert_header(("If-None-Match", "*"))
                    .to_http_request(),
                Some(EntityTag::new_strong("foo".to_owned()))
            ),
            Ok(Some(false))
        );
    }

    #[test]
    fn test_none_match_any_none() {
        assert_eq!(
            none_match(
                &TestRequest::default()
                    .insert_header(("If-None-Match", "*"))
                    .to_http_request(),
                None
            ),
            Ok(Some(true))
        );
    }

    #[test]
    fn test_none_match_some_some() {
        assert_eq!(
            none_match(
                &TestRequest::default()
                    .insert_header(("If-None-Match", "\"foo\""))
                    .to_http_request(),
                Some(EntityTag::new_strong("foo".to_owned()))
            ),
            Ok(Some(false))
        );
    }

    #[test]
    fn test_none_match_some_none() {
        assert_eq!(
            none_match(
                &TestRequest::default()
                    .insert_header(("If-None-Match", "\"foo\""))
                    .to_http_request(),
                None
            ),
            Ok(Some(true))
        );
    }

    #[test]
    fn test_none_match_some_unknown() {
        assert_eq!(
            none_match(
                &TestRequest::default()
                    .insert_header(("If-None-Match", "\"foo\""))
                    .to_http_request(),
                Some(EntityTag::new_strong("bar".to_owned()))
            ),
            Ok(Some(true))
        );
    }
}
