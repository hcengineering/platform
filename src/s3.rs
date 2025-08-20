use aws_config::{BehaviorVersion, Region};
use aws_sdk_s3::Config;

pub type S3Client = aws_sdk_s3::Client;

pub async fn client() -> S3Client {
    //let config = aws_sdk_s3::Config::builder()
    //    .behavior_version_latest()
    //    .force_path_style(true)
    //    .region(Region::new("us-west-4"))
    //    .build();

    let ref config = aws_config::defaults(BehaviorVersion::latest())
        .load()
        .await
        .into_builder()
        .build();

    //let mut config = config.into::<Config>();
    let s3config = Config::from(config)
        .to_builder()
        .force_path_style(true)
        .build();

    S3Client::from_conf(s3config)
}
