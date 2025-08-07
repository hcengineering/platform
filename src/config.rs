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

use serde::Deserialize;
use serde_with::formats::CommaSeparator;
use serde_with::{StringWithSeparator, serde_as};

use url::Url;

use std::{path::Path, sync::LazyLock};

use config::FileFormat;

use uuid::Uuid;

#[derive(Deserialize, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RedisMode {
    Sentinel,
    Direct,
}

#[serde_as]
#[derive(Deserialize, Debug)]
pub struct Config {
    pub bind_port: u16,
    pub bind_host: String,
    pub payload_size_limit: size::Size,

    pub token_secret: String,

    #[serde_as(as = "StringWithSeparator::<CommaSeparator, url::Url>")]
    pub redis_urls: Vec<Url>,
    pub redis_password: String,
    pub redis_mode: RedisMode,
    pub redis_service: String,

    pub max_ttl: usize,
}

pub static CONFIG: LazyLock<Config> = LazyLock::new(|| {
    const DEFAULTS: &str = std::include_str!("config/default.toml");

    let mut builder =
        config::Config::builder().add_source(config::File::from_str(DEFAULTS, FileFormat::Toml));

    let path = Path::new("etc/config.toml");

    if path.exists() {
        builder = builder.add_source(config::File::with_name(path.as_os_str().to_str().unwrap()));
    }

    let settings = builder
        .add_source(config::Environment::with_prefix("HULY"))
        .build()
        .and_then(|c| c.try_deserialize::<Config>());

    match settings {
        Ok(settings) => settings,
        Err(error) => {
            eprintln!("configuration error: {}", error);
            std::process::exit(1);
        }
    }
});
