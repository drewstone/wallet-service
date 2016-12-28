const Promise = require('bluebird');
const Utility = require('./utility')();
const Bitcore = require('bitcore-lib');
const PaymentProtocol = require('bitcore-payment-protocol');
const fs = require('fs');

class Wallet {
  constructor(config) {
    this.config = config;
    this.Bitcore = Bitcore;
    this.PaymentProtocol = PaymentProtocol;
    return this;
  }

  /**
   * Creates a new wallet using BWS (bitcore-wallet-service)
   * @param  {Object} options {
   *                              file - Path of file
   *                              password - Password to decrypt wallet (ENCRYPTED ONLY)
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
  createWallet(options) {
    return new Promise((resolve, reject) => {
      Utility.getClient(options, {
        doNotComplete: true,
        password: options.password
      }, client => {
        client.createWallet(options.name, options.copayer, options.m, options.n, options.ext, (err, secret) => {
          if (Utility.die(err, reject)) {
            Utility.saveClient(options, client, () => resolve({secret: secret}));
          }
        });
      });
    });
  }

  getWallet(options) {
    return new Promise((resolve, reject) => {
      Utility.getClient(options, {
        mustExist: true
      }, client => {
        resolve(client);
      })
    });
  }

  /**
   * Imports wallet from a given destination
   * @param  {Object} options {
   *                            file - File path for imported key/wallet
   *                            qr - If importing from QR code
   *                            exportpassword - Password used to decrypt wallet being imported
   *                            host - Host for bitcorewallet-service
   *                          }
   * @param  {String} importFile Path of file to be imported
   * @return {String}            Confirmation of import
   */
  importWallet(options, importFile) {
    return new Promise((resolve, reject) => {
      Utility.getClient(options, {
        mustBeNew: true
      }, client => {
        if (options.file) {
          const str = fs.readFileSync(importFile);
          try {
            client.import(JSON.parse(str), {
              compressed: !!options.qr,
              password: options.exportpassword
            });
          } catch (exception) {
            reject(exception);
          }

          Utility.saveClient(options, client, () => {
            const access = client.canSign() ? 'with signing capability' : 'without signing capability';
            resolve(`Wallet Imported ${access}.`);
          });
        } else {
          const mnemonics = options.mnemonics;
          const passphrase = options.passphrase;
          const network = options.testnet ? 'testnet' : 'livenet';
          client.importFromMnemonic(mnemonics, {
            network: network,
            passphrase: passphrase
          }, err => {
            if (Utility.die(err, reject)) {
              Utility.saveClient(options, client, () => {
                const access = client.canSing() ? 'with signing capability' : 'without signing capability';
                resolve(`Wallet Imported ${access}.`);
              });
            }
          });
        }
      });
    });
  }

  createAddress(options) {
    return new Promise((resolve, reject) => {
      Utility.getClient(options, {
        mustExist: true
      }, client => {
        client.createAddress({}, (err, x) => {
          if (Utility.die(err, reject)) {
            resolve(x.address);
          }
        });
      });
    });
  }

  getAddresses(options) {
    return new Promsie((resolve, reject) => {
      Utility.getClient(options, {
        mustExist: true
      }, client => {
        client.getMainAddresses({
          doNotVerify: true
        }, (err, x) => {
          if (Utility.die(err, reject)) {
            resolve(x);
          }
        });
      });
    });
  }

  getBalance(options) {
    return new Promise((resolve, reject) => {
      Utility.getClient(options, {
        mustExist: true
      }, client => {
        client.getBalance({}, function(err, x) {
          if (Utility.die(err, reject)) {
            resolve(`* Wallet balance ${Utility.renderAmount(x.totalAmount)} (Locked ${Utility.renderAmount(x.lockedAmount)})`);
          }
        });
      });      
    })
  }

  /**
   * Generates transaction
   * @param  {Object} options {
   *                            walletName - Name of wallet
   *                            payment {
   *                              to - Address to send payment to
   *                              amount - Amount to pay
   *                              note - Note to send with payment
   *                            }
   *                          }
   * @return {[type]}         [description]
   */
  generateTransaction(options) {
    options.feePerKb = options.feePerKb || 100e2;
    options.note = options.note || 'General Source Payment';

    return new Promise((resolve, reject) => {
      Utility.getClient(options, {
        mustExist: true
      }, client => {
        client.createTxProposal({
          outputs: [{
            toAddress: options.payment.to,
            amount: options.payment.amount
          }],
          message: options.payment.note,
          feePerKb: options.feePerKb
        }, (err, txp) => {
          if (Utility.die(err, reject)) {
            client.publishTxProposal({
              txp: txp
            }, err => {
              if (Utility.die(err, reject)) {
                resolve(' * Tx created: ID %s [%s] RequiredSignatures:', Utility.shortID(txp.id), txp.status, txp.requiredSignatures);
              }
            });
          }
        });
      });
    });
  }

  signTransaction(options) {
    return new Promise((resolve, reject) => {
      Utility.getClient(options, {
        mustExist: true
      }, client => {
        return options.input === undefined ? client.getTxProposals({}, (err, txps) => {
          if (Utility.die(err, reject)) {
            const txp = Utility.findOneTxProposal(txps, options.txpid);
            client.signTxProposal(txp, (err, tx) => {
              if (Utility.die(err, reject)) {
                resolve('Transaction signed by you');
              }
            })
          }
        }) : Utility.processBatch(client, JSON.parse(fs.readFileSync(program.input)), resolve, reject);
      });
    });
  }

  broadcastTransaction(options) {
    return new Promise((resolve, reject) => {
      Utility.getClient(options, {
        mustExist: true
      }, client => {
        client.getTxProposals({}, (err, txps) => {
          if (Utility.die(err, reject)) {
            const txp = Utility.findOneTxProposal(txps, options.txpid);
            client.broadcast(txp, (err, txp) => {
              if (Utility.die(err, reject)) {
                resolve('Transaction Broadcasted: TXID: ' + txp.txid);
              }
            });
          }
        });
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
