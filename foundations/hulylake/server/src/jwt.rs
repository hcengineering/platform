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

use jsonwebtoken::{self as jwt, Algorithm};
use jsonwebtoken::{DecodingKey, Validation};
use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fmt::Debug;
use std::{collections::HashMap, sync::LazyLock};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
    #[error(transparent)]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("{0}")]
    Other(&'static str),
}

static SYSTEM_UUID: LazyLock<Uuid> =
    LazyLock::new(|| "1749089e-22e6-48de-af4e-165e18fbd2f9".parse().unwrap());
static GUEST_UUID: LazyLock<Uuid> =
    LazyLock::new(|| "b6996120-416f-49cd-841e-e4a5d2e49c9b".parse().unwrap());

#[derive(Serialize, Deserialize, Default, Clone, derive_builder::Builder)]
pub struct Claims {
    #[builder(setter(into))]
    pub account: Uuid,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    #[builder(setter(into, strip_option), default)]
    pub workspace: Option<Uuid>,

    #[serde(skip_serializing_if = "HashMap::is_empty", default)]
    #[builder(setter(custom), default)]
    pub extra: HashMap<String, String>,
}

impl Debug for Claims {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Claims")
            .field("account", &self.account)
            .field("workspace", &self.workspace)
            .field("extra", &self.extra)
            .finish_non_exhaustive()
    }
}

impl Claims {
    pub fn from_token(token: impl AsRef<str>, secret: impl AsRef<[u8]>) -> Result<Self, Error> {
        let key = DecodingKey::from_secret(secret.as_ref());

        let mut validation = Validation::new(Algorithm::HS256);
        validation.required_spec_claims = HashSet::new();

        Ok(jwt::decode(token.as_ref(), &key, &validation)?.claims)
    }

    pub fn account(&self) -> Uuid {
        self.account
    }

    pub fn workspace(&self) -> Result<Uuid, Error> {
        self.workspace
            .ok_or_else(|| Error::Other("No workspace in claims"))
    }

    pub fn encode(&self, secret: &SecretString) -> Result<SecretString, Error> {
        let header = jwt::Header::default();
        let key = jwt::EncodingKey::from_secret(secret.expose_secret().as_bytes());

        Ok(jwt::encode(&header, self, &key)?.into())
    }

    pub fn is_system(&self) -> bool {
        self.account == *SYSTEM_UUID
    }

    pub fn is_guest(&self) -> bool {
        self.account == *GUEST_UUID
    }

    pub fn is_user(&self) -> bool {
        !self.is_system() && !self.is_guest()
    }
}

impl ClaimsBuilder {
    pub fn system_account(&mut self) -> &mut Self {
        self.account = Some(*SYSTEM_UUID);
        self
    }

    pub fn guest_account(&mut self) -> &mut Self {
        self.account = Some(*GUEST_UUID);
        self
    }

    pub fn extra<K, V>(&mut self, key: K, value: V) -> &mut Self
    where
        K: Into<String>,
        V: Into<String>,
    {
        if self.extra.is_none() {
            self.extra = Some(HashMap::new());
        }

        self.extra
            .as_mut()
            .unwrap()
            .insert(key.into(), value.into());

        self
    }

    pub fn service<S: Into<String>>(&mut self, service: S) -> &mut Self {
        self.extra("service", service)
    }
}

pub mod actix {
    use actix_web::{dev::ServiceRequest, error};
    use secrecy::{ExposeSecret, SecretString};

    use super::Claims;

    pub trait ServiceRequestExt {
        fn extract_token_raw(&self) -> Result<&str, actix_web::Error>;
        fn extract_claims(&self, secret: &SecretString) -> Result<Claims, actix_web::Error>;
    }

    impl ServiceRequestExt for ServiceRequest {
        fn extract_token_raw(&self) -> Result<&str, actix_web::Error> {
            self.headers()
                .get("Authorization")
                .and_then(|v| v.to_str().map(|s| s.strip_prefix("Bearer ")).ok())
                .flatten()
                .ok_or_else(|| error::ErrorUnauthorized("NoAuthToken"))
        }

        fn extract_claims(&self, secret: &SecretString) -> Result<Claims, actix_web::Error> {
            use super::jwt::{Algorithm, DecodingKey, Validation, decode};
            use std::collections::HashSet;

            let token = self.extract_token_raw()?;

            let key = DecodingKey::from_secret(secret.expose_secret().as_bytes());
            let mut validation = Validation::new(Algorithm::HS256);
            validation.required_spec_claims = HashSet::new();

            let claims = decode::<Claims>(token, &key, &validation)
                .map(|token_data| token_data.claims)
                .map_err(|_e| error::ErrorUnauthorized("InvalidToken"))?;

            Ok(claims)
        }
    }
}
