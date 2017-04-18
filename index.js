/* jshint node: true */
'use strict';

const fs             = require('fs');
const path           = require('path');
const RSVP           = require('rsvp');
const mkdirp         = require('mkdirp');
const S3UploadClient = require('./lib/s3');
const rename         = RSVP.denodeify(fs.rename);
const BasePlugin     = require('ember-cli-deploy-plugin');
const md5Hash        = require('./lib/utils/md5-hash');


module.exports = {
  name: 'ember-cli-deploy-fastboot-s3-downloader-manifest',

  createDeployPlugin(options) {
    let DeployPlugin = BasePlugin.extend({
      name: options.name,
      prepare(context) {
        let config = context.config['fastboot-s3-downloader-manifest'];
        let archivePath = config.archivePath;
        let outputPath = config.outputPath;
        let ext = this.parseExt(archivePath);
        let fileName = path.basename(archivePath, ext);
        let archiveStream = fs.createReadStream(archivePath);

        return md5Hash(archiveStream).then((hash) => {
          let newFileName = `${fileName}-${hash}${ext}`;
          let newFilePath = path.join(outputPath, newFileName);

          mkdirp.sync(outputPath);
          return rename(archivePath, newFilePath).then(() => {
            let manifestFile =
`{
  "bucket": "${config.bucket}",
  "key": "${newFileName}"
}`;

            fs.writeFileSync(path.join(outputPath, config.manifestName), manifestFile);

            let s3 = new S3UploadClient(context);

            return {
              uploadClient: s3,
              distFiles: [
                newFileName,
                config.manifestName
              ]
            };
          });
        });
      },

      parseExt(archivePath) {
        return archivePath.match(/(\.tar\.gz|\.zip|.tar)$/)[0];
      }
    });

    return new DeployPlugin();
  }
};
