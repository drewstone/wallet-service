const Promise = require('bluebird');
const Client = require('bitcore-wallet-client');
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');

const BWS_INSTANCE_URL = 'https://bws.bitpay.com/bws/api'

module.exports = () => {
  const Errors = {
    ADDRESS_CREATION_FAILURE: 'Failed to create address in wallet'
  };

  const createWalletClient = () => {
    return new Client({
      baseUrl: BWS_INSTANCE_URL,
      verbose: false
    });
  };

  const collectWalletClients = (path) => {
    const wallets = {};
    return new Promise((resolve, reject) => {
      return fs.readdirAsync(path)
      .then(files => {
        return Promise.map(files, file => {
          return fs.readFileAsync([path, '/', file].join(''));
        })
        .then(data => {
          return _.forEach(files, (file, index) => {
            wallets[file.slice(0, file.length - 4)] = createWalletClient();
            return wallets[file.slice(0, file.length - 4)].import(data[index]);
          });
        })
        .then(() => resolve(wallets))
        .catch(reject);
      });
    });
  };

  return {
    Errors,
    createWalletClient,
    collectWalletClients
  };
};
