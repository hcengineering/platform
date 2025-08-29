use std::sync::LazyLock;

pub struct Config {
    pub base_url: String,
}

pub static CONFIG: LazyLock<Config> = LazyLock::new(|| {
    let config = tanu::get_config();

    Config {
        base_url: config.get_str("base_url").unwrap().to_string(),
    }
});
