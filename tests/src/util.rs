use crate::config::CONFIG;
use rand::{Rng, RngCore};
use reqwest::Body;
use secrecy::ExposeSecret;
use tanu::http::{Client, Method, RequestBuilder};

pub trait ClientExt {
    fn key_head(&self, key: &str) -> RequestBuilder;
    fn key_get(&self, key: &str) -> RequestBuilder;
    fn key_put(&self, key: &str) -> RequestBuilder;
    fn key_post(&self, key: &str) -> RequestBuilder;
    fn key_delete(&self, key: &str) -> RequestBuilder;
    fn request(&self, method: &Method, path: &str) -> RequestBuilder;
}

pub fn path(key: &str) -> String {
    format!("{}/api/{}/{key}", CONFIG.base_url, CONFIG.workspace)
}

impl ClientExt for Client {
    fn request(&self, method: &Method, path: &str) -> RequestBuilder {
        match *method {
            Method::HEAD => self.head(path),
            Method::GET => self.get(path),
            Method::PUT => self.put(path),
            Method::POST => self.post(path),
            Method::DELETE => self.delete(path),
            _ => panic!("unsupported method"),
        }
    }

    fn key_head(&self, key: &str) -> RequestBuilder {
        self.head(path(key))
            .bearer_auth(CONFIG.token_valid.expose_secret())
    }

    fn key_get(&self, key: &str) -> RequestBuilder {
        self.get(path(key))
            .bearer_auth(CONFIG.token_valid.expose_secret())
    }

    fn key_put(&self, key: &str) -> RequestBuilder {
        self.put(path(key))
            .bearer_auth(CONFIG.token_valid.expose_secret())
    }

    fn key_post(&self, key: &str) -> RequestBuilder {
        self.post(path(key))
            .bearer_auth(CONFIG.token_valid.expose_secret())
    }

    fn key_delete(&self, key: &str) -> RequestBuilder {
        self.get(path(key))
            .bearer_auth(CONFIG.token_valid.expose_secret())
    }
}

pub fn random_text(length: usize) -> String {
    let mut rng = rand::rng();
    let charset: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";

    let text: String = (0..length)
        .map(|_| {
            let idx = rng.random_range(0..charset.len());
            charset[idx] as char
        })
        .collect();

    text
}

pub fn random_body(size: usize) -> Body {
    let mut rng = rand::rng();
    let mut bytes = vec![0u8; size];

    rng.fill_bytes(&mut bytes);

    Body::from(bytes)
}

pub fn random_key() -> String {
    let mut rng = rand::rng();
    let mut bytes = vec![0u8; 16];

    rng.fill_bytes(&mut bytes);

    hex::encode(bytes)
}
