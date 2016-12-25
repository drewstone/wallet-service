const Promise = require('bluebird');
const Utility = require('./utility')();
const fs = require('fs');

class Wallet {
  constructor(config) {
    return Utility.collectWalletClients(config.KEY_STORAGE_DIR)
    .then(wallets => {
      this.wallets = wallets;
      this.config = config;
      return this;
    })
  }

  /**
   * Creates a new wallet using BWS (bitcore-wallet-service)
   * @param  {Object} options {
   *                              name - Name of the wallet
   *                              copayer - The copayer added to the wallet
   *                              m - First multi-sig value
   *                              n - Second multi-sig value
   *                              ext - An object with more options {
   *                                network - testnet/mainnet for Bitcoin network
   *                              }
   *                            }
   * @return {Boolean}         Successful wallet creation or error spec
   */
  createNewWallet(options) {
    return new Promise((resolve, reject) => {

      // Check if a wallet with this name already exists
      if (this.wallets.hasOwnProperty(options.name)) {
        resolve(false);
      } else {
        const client = Utility.createWalletClient();
        client.createWallet(options.name, options.copayer, options.m, options.n, options.ext, (error) => {
          if (!error) {
            const fileName = [options.name, '.dat'].join('')
            const filePath = [this.config.KEY_STORAGE_DIR, fileName].join('/');
            fs.writeFile(filePath, client.export(), (err) => {
              if (!err) {
                this.wallets[options.name] = client;
                resolve(true)
              }
              else reject(err);
            });
          } else {
            reject(error);
          }
        });
      }
    });
  }

  /**
   * Sends transaction originating at wallet
   * @param  {Object} options {
   *                            walletName - Name of wallet
   *                            payment {
   *                              to - Address to send payment to
   *                              amount - Amount to pay
   *                            }
   *                          }
   * @return {[type]}         [description]
   */
  sendTransaction(options) {
    return new Promise((resolve, reject) => {
      const targetWallet = this.wallets[options.walletName];
      const address = targetWallet.createAddress({}, (err, addr) => {
        if (!err) return address;
        else return reject(Utility.Errors.ADDRESS_CREATION_FAILURE);
      });

      targetWallet.fetchPayPro({ payProUrl: 'dummy' }, (err, paypro) => {
        console.log(paypro);
      });
    });
  }
}

module.exports = (config) => () => {
  if (config.NODE_ENV === 'dev') {
    const configuration = Object.assign({}, config, {KEY_STORAGE_DIR: process.env.PWD.concat('/data')});
    return new Wallet(configuration); 
  } else if (config.NODE_ENV === 'staging') {
    return;
  } else if (config.NODE_ENV === 'prod') {
    return;
  }
};
