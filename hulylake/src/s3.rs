use aws_config::BehaviorVersion;
use aws_sdk_s3::Config;

pub type S3Client = aws_sdk_s3::Client;

pub async fn client() -> S3Client {
    let ref sdk_config = aws_config::defaults(BehaviorVersion::latest())
        .load()
        .await
        .into_builder()
        .build();

    let s3_config = Config::from(sdk_config)
        .to_builder()
        .force_path_style(true)
        .build();

    S3Client::from_conf(s3_config)
}
