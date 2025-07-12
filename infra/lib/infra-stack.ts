import * as cdk   from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

import * as s3          from 'aws-cdk-lib/aws-s3';
import * as cloudfront  from 'aws-cdk-lib/aws-cloudfront';
import * as origins     from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb    from 'aws-cdk-lib/aws-dynamodb';
import * as lambda      from 'aws-cdk-lib/aws-lambda';
import * as lambdanode  from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path        from 'path';

import * as apigw  from '@aws-cdk/aws-apigatewayv2-alpha';
import * as integ  from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* 1  Bucket S3 */
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      websiteIndexDocument: 'index.html',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    /* 2  CloudFront */
    const cdn = new cloudfront.Distribution(this, 'SiteCDN', {
      defaultBehavior: { origin: new origins.S3Origin(siteBucket) },
      defaultRootObject: 'index.html',
    });

    /* 3  DynamoDB */
    const table = new dynamodb.Table(this, 'Events', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      billingMode : dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,   
    });

    /* 4  Lambda */
    const createEventFn = new lambdanode.NodejsFunction(this, 'CreateEventFn', {
      entry: path.join(__dirname, '..', '..', 'backend', 'createEvent', 'index.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(5),
      projectRoot: path.join(__dirname, '..', '..'), 
      environment: { TABLE_NAME: table.tableName },
    });
    table.grantWriteData(createEventFn);

    /* 5  API Gateway HTTP */
    const api = new apigw.HttpApi(this, 'Api', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.OPTIONS],
        allowHeaders: ['content-type'],
      },
    });

    api.addRoutes({
      path: '/events',
      methods: [apigw.HttpMethod.POST],
      integration: new integ.HttpLambdaIntegration(
        'EventsIntegration',
        createEventFn
      ),
    });

    /* 6  Outputs */
    new cdk.CfnOutput(this, 'SiteURL', { value: `https://${cdn.domainName}` });
    new cdk.CfnOutput(this, 'ApiURL',  { value: api.url! });
  }
}

