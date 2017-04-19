/* jshint node: true */
'use strict';

const fs   = require('fs');
const path = require('path');
const mime = require('mime');
const AWS  = require('aws-sdk');
const RSVP = require('rsvp');

class S3UploadClient {
  constructor(context) {
    this.context = context;
    this.config = this.context.config.s3;

    let s3Options = {
      region: this.config.region
    };

    const accessKeyId = this.config['accessKeyId'];
    const secretAccessKey = this.config['secretAccessKey'];
    const sessionToken = this.config['sessionToken'];

    if (accessKeyId && secretAccessKey) {
      // this._plugin.log('Using AWS access key id and secret access key from config', { verbose: true });
      s3Options.accessKeyId = accessKeyId;
      s3Options.secretAccessKey = secretAccessKey;
    }

    if (sessionToken) {
      // this._plugin.log('Using AWS session token from config', { verbose: true });
      s3Options.sessionToken = sessionToken;
    }

    this.client = this.readConfig('s3Client') || new AWS.S3(s3Options);
  }

  readConfig(property) {
    let configuredValue = this.config[property];

    if (typeof configuredValue === 'function') {
      return configuredValue.call(this, this.context);
    }

    return configuredValue;
  }

  upload(options) {
    let archive = options.filePaths[0];
    let manifest = options.filePaths[1];

    return new RSVP.Promise((resolve, reject) => {
      this.client.putObject(this.getParamsFor(archive, options), (error, data) => {
        if (error) {
          reject(error);
        } else {
          this.client.putObject(this.getParamsFor(manifest, options), (error, data) => {
            if (error) {
              reject(error);
            } else {
              resolve('files uploaded!');
            }
          });
        }
      });
    });
  }

  getParamsFor(filePath, options) {
    let basePath    = path.join(options.cwd, filePath);
    let data        = fs.readFileSync(basePath);
    let contentType = mime.lookup(basePath);
    let encoding    = mime.charsets.lookup(contentType);
    let key         = options.prefix === '' ? filePath : [options.prefix, filePath].join('/');

    return {
      Bucket: options.bucket,
      ACL: options.acl,
      Body: data,
      ContentType: contentType,
      Key: key,
      CacheControl: options.cacheControl,
      Expires: options.expires
    };
  }
}

module.exports = S3UploadClient;
