import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'
import * as cloud from '@pulumi/cloud'

import { getType } from 'mime'

import { readdirSync, lstatSync } from 'fs'
import { join } from 'path'

import { handle } from '@anticrm/dev-account'

const siteBucket = new aws.s3.Bucket('anticrm-app', {
  acl: "public-read",
  website: {
    indexDocument: 'index.html'
  }
})

const buildDir = "../../dev/prod"

function createObjects(root: string, path: string): void {
  const dir = join(root, path)
  for (const file of readdirSync(dir)) {
    const relative = join(path, file)
    const absolute = join(root, relative)
    if (lstatSync(absolute).isDirectory()) {
      createObjects(root, relative)
    } else {
      new aws.s3.BucketObject(relative, {
        acl: 'public-read',
        bucket: siteBucket,
        source: new pulumi.asset.FileAsset(absolute),     // use FileAsset to point to a file
        contentType: getType(absolute) || undefined, // set the MIME type of the file
      })  
    }

  }
}

createObjects(buildDir + '/public', '')
createObjects(buildDir + '/dist', '')

export const bucketName = siteBucket.bucket // create a stack export for bucket name
export const websiteUrl = siteBucket.websiteEndpoint

// // Create an S3 Bucket Policy to allow public read of all objects in bucket
// // This reusable function can be pulled out into its own module
// function publicReadPolicyForBucket(bucketName: string) {
//   return JSON.stringify({
//     Version: "2012-10-17",
//     Statement: [{
//       Effect: "Allow",
//       Principal: "*",
//       Action: [
//         "s3:GetObject"
//       ],
//       Resource: [
//         `arn:aws:s3:::${bucketName}/*` // policy refers to bucket name explicitly
//       ]
//     }]
//   })
// }

// // Set the access policy for the bucket so all objects are readable
// new aws.s3.BucketPolicy('bucketPolicy', {
//   bucket: siteBucket.bucket, // depends on siteBucket -- see explanation below
//   policy: siteBucket.bucket.apply(publicReadPolicyForBucket)
//           // transform the siteBucket.bucket output property -- see explanation below
// });

// D O C K E R

const service = new cloud.Service("dev-server", {
  containers: {
      server: {
          build: "./dev-server",
          memory: 128,
          ports: [{ port: 3333 }],
      },
  },
  replicas: 1,
})

export const serverEndpoint = service.defaultEndpoint.hostname

//
// L O G I N
//

// Define a new GET endpoint that just returns a 200 and "hello" in the body.
const api = new awsx.apigateway.API("login", {
  routes: [{
      path: "/",
      method: "POST",
      eventHandler: async (event) => {
        return handle(event.body, serverEndpoint.get())
      },
  }],
})

// Export the auto-generated API Gateway base URL.
export const url = api.url

//
// D N S
//

// Get the hosted zone by domain name
const zoneId = aws.route53.getZone({ name: "hc.engineering." }).then(zone => zone.zoneId)

const tenMinutes = 60 * 10

// Per AWS, ACM certificate must be in the us-east-1 region.
const eastRegion = new aws.Provider("east", {
  profile: aws.config.profile,
  region: "us-east-1",
})

const certificate = new aws.acm.Certificate(
  "certificate",
  {
    domainName: "app.hc.engineering",
    validationMethod: "DNS",
  },
  { provider: eastRegion }
);

const certificateValidationDomain = new aws.route53.Record(
  "app.hc.engineering-validation",
  {
    name: certificate.domainValidationOptions[0].resourceRecordName,
    zoneId: zoneId,
    type: certificate.domainValidationOptions[0].resourceRecordType,
    records: [certificate.domainValidationOptions[0].resourceRecordValue],
    ttl: tenMinutes,
  }
);

const certificateValidation = new aws.acm.CertificateValidation(
  "certificateValidation",
  {
    certificateArn: certificate.arn,
    validationRecordFqdns: [certificateValidationDomain.fqdn],
  },
  { provider: eastRegion }
)

// distributionArgs configures the CloudFront distribution. Relevant documentation:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html
// https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html
const distributionArgs: aws.cloudfront.DistributionArgs = {
  enabled: true,
  // Alternate aliases the CloudFront distribution can be reached at, in addition to https://xxxx.cloudfront.net.
  // Required if you want to access the distribution via config.targetDomain as well.
  aliases: ["app.hc.engineering"],

  // We only specify one origin for this distribution, the S3 content bucket.
  origins: [
    {
      originId: siteBucket.arn,
      domainName: siteBucket.websiteEndpoint,
      customOriginConfig: {
        // Amazon S3 doesn't support HTTPS connections when using an S3 bucket configured as a website endpoint.
        // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesOriginProtocolPolicy
        originProtocolPolicy: "http-only",
        httpPort: 80,
        httpsPort: 443,
        originSslProtocols: ["TLSv1.2"],
      },
    },
  ],

  defaultRootObject: "index.html",

  // A CloudFront distribution can configure different cache behaviors based on the request path.
  // Here we just specify a single, default cache behavior which is just read-only requests to S3.
  defaultCacheBehavior: {
    targetOriginId: siteBucket.arn,

    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],

    forwardedValues: {
      cookies: { forward: "none" },
      queryString: false,
    },

    minTtl: 0,
    defaultTtl: tenMinutes,
    maxTtl: tenMinutes,
  },

  // "All" is the most broad distribution, and also the most expensive.
  // "100" is the least broad, and also the least expensive.
  priceClass: "PriceClass_100",

  // You can customize error responses. When CloudFront receives an error from the origin (e.g. S3 or some other
  // web service) it can return a different error code, and return the response for a different resource.
  customErrorResponses: [
    { errorCode: 404, responseCode: 200, responsePagePath: "/index.html"  },
  ],

  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },

  viewerCertificate: {
    acmCertificateArn: certificateValidation.certificateArn, // Per AWS, ACM certificate must be in the us-east-1 region.
    sslSupportMethod: "sni-only",
  },
}

const cdn = new aws.cloudfront.Distribution("cdn", distributionArgs)

// Create a Route53 A-record
new aws.route53.Record("targetDomain", {
  name: "app.hc.engineering",
  zoneId: zoneId,
  type: "A",
  aliases: [{
      zoneId: cdn.hostedZoneId,
      name: cdn.domainName,
      evaluateTargetHealth: true,
  }],
})
