use std::sync::LazyLock;

use hulyrs::services::jwt::ClaimsBuilder;
use secrecy::SecretString;
use uuid::{Uuid, uuid};

pub struct Config {
    pub base_url: String,
    pub workspace: Uuid,
    pub token_valid: SecretString,
    pub token_invalid: SecretString,
}

pub static CONFIG: LazyLock<Config> = LazyLock::new(|| {
    let config = tanu::get_config();

    let secret = SecretString::from("secret");

    let workspace = uuid!("dc06ad17-58af-4166-beca-48e40c990d51");
    let workspace_invalid = uuid!("2f52775a-57a1-4fc1-aa90-d6cde40d4b5a");
    let account = uuid!("34cee70d-52c4-47a1-a33a-7fec6e3e7ada");

    let claims_valid = ClaimsBuilder::default()
        .workspace(workspace)
        .account(account)
        .build()
        .unwrap();

    let claims_invalid = ClaimsBuilder::default()
        .workspace(workspace_invalid)
        .account(account)
        .build()
        .unwrap();

    let token_valid = claims_valid.encode(&secret).unwrap();
    let token_invalid = claims_invalid.encode(&secret).unwrap();

    Config {
        base_url: config.get_str("base_url").unwrap().to_string(),
        workspace,
        token_valid,
        token_invalid,
    }
});
