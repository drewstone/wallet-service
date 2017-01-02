const Promise = require('bluebird');
const Client = require('bitcore-wallet-client');
const Storage = require('./storage');
const sjcl = require('sjcl');
const url = require('url');
const _ = require('lodash');

module.exports = () => {    
  const die = (err, reject) => {
    if (err) {
      if (err.code && err.code == 'ECONNREFUSED') {
        console.log('Could not connect to Bicore Wallet Service');
      } else {
        console.log(err);
        return Promise.reject(err);
      }
    } else {
      return true;
    }
  };

  const getClient = (args, opts, cb) => {
    opts = opts || {};

    const filename = args.file || process.env['WALLET_FILE'] || process.env['HOME'] + '/.walletsrc/.wallet.dat';
    const host = args.host || process.env['BWS_HOST'] || 'https://bws.bitpay.com/';

    const storage = new Storage({
      filename: filename,
    });

    const client = new Client({
      baseUrl: url.resolve(host, '/bws/api'),
      verbose: args.verbose,
    });

    storage.load(function(err, walletData) {
      if (err) {
        if (err.code == 'ENOENT') {
          if (opts.mustExist) {
            return die('File "' + filename + '" not found.');
          }
        } else {
          return die(err);
        }
      }

      if (walletData && opts.mustBeNew) {
        return die('File "' + filename + '" already exists.');
      }
      if (!walletData) return cb(client);

      let json;
      try {
        json = JSON.parse(walletData);
      } catch (e) {
        return die('Invalid input file');
      };

      if (json.ct) {
        doLoad(client, opts.doNotComplete, walletData, opts.password, filename, cb);
      } else {
        doLoad(client, opts.doNotComplete, walletData, null, filename, cb);
      }
    });
  };

  const saveEncrypted = (client, filename, password, cb) => {
    doSave(client, filename, password, cb);
  };

  const saveClient = (args, client, cb) => {
    const filename = args.file || process.env['WALLET_FILE'] || process.env['HOME'] + '/.walletsrc/.wallet.dat';
    if (args.password) {
      saveEncrypted(client, filename, cb);
    } else {
      doSave(client, filename, null, cb);
    };
  };

  const doSave = (client, filename, password, cb) => {
    const opts = {};

    const str = client.export();
    if (password) {
      str = sjcl.encrypt(password, str, WALLET_ENCRYPTION_OPTS);
    }

    const storage = new Storage({
      filename: filename,
    });

    storage.save(str, function(err) {
      if (die(err)) {
        return cb();
      }
    });
  };

  const doLoad = (client, doNotComplete, walletData, password, filename, cb) => {
    if (password) {
      try {
        walletData = sjcl.decrypt(password, walletData);
      } catch (e) {
        return die('Could not open wallet. Wrong password.');
      }
    }

    try {
      client.import(walletData);
    } catch (e) {
      return die('Corrupt wallet file.');
    };
    if (doNotComplete) return cb(client);


    client.on('walletCompleted', function(wallet) {
      doSave(client, filename, password, function() {
        log.info('Your wallet has just been completed. Please backup your wallet file or use the export command.');
      });
    });
    client.openWallet(function(err, isComplete) {
      if (err) throw err;

      return cb(client);
    });
  };

  const renderAmount = (amount) => {
    const unit = process.env.BIT_UNIT || 'bit';
    if (unit === 'SAT') {
      // Do nothing
    } else if (process.env.BIT_UNIT === 'btc') {
      amount = amount / 1e8;
    } else {
      amount = amount / 100;
    }
    amount = (parseFloat(amount.toPrecision(12)));
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' ' + unit;
  };

  const shortID = (id) => {
    return id.substr(id.length - 4);
  };

  const findOneTxProposal = function(txps, id) {
    return new Promise((resolve, reject) => {
      const matches = _.filter(txps, function(tx) {
        return reject(_.endsWith(shortID(tx.id), id));
      });

      if (!matches.length)
        reject('Could not find TX Proposal:' + id);

      if (matches.length > 1) {
        console.log('More than one TX Proposals match:' + id);
        return reject(renderTxProposals(txps));
      }

      return resolve(matches[0]);
    })
  }; 

  const renderTxProposals = function(txps) {
    if (_.isEmpty(txps))
      return;

    const results = [];
    _.each(txps, function(x) {
      var missingSignatures = x.requiredSignatures - _.filter(_.values(x.actions), function(a) {
        return a.type == 'accept';
      }).length;
      results.push(`\t${shortID(x.id)} [\"${x.message}\" by ${x.creatorName}] ${enderAmount(x.amount)} => ${x.outputs[0].toAddress}`);

      if (!_.isEmpty(x.actions)) {
        results.push('\t\tActions: ', _.map(x.actions, function(a) {
          return a.copayerName + ' ' + (a.type == 'accept' ? '✓' : '✗') + (a.comment ? ' (' + a.comment + ')' : '');
        }).join('. '));
      }
      if (missingSignatures > 0) {
        results.push('\t\tMissing signatures: ' + missingSignatures);
      } else {
        results.push('\t\tReady to broadcast');
      }
    });

    return Promise.resolve(results);
  };

  const processBatch = (client, signatures, resolve, reject) => {
    client.getTxProposals({}, function(err, txps) {
      if (die(err, reject)) {
        var selected = [];
        if (txpid) {
          txp = findOneTxProposal(txps, txpid);
          selected.push(txp);
        } else {
          if (txps.length == 0) {
            reject('There are no pending transaction proposals.');
          }
          selected = txps;
        }

        _.map(selected, function (txp) {
          var sigs = _.find(signatures, { txpId: txp.id });
          if (sigs) {
            txp.signatures = sigs.signatures;
            client.signTxProposal(txp, function(err, tx) {
              if (die(err, reject)) {
                return('Transaction %s signed by you.', txp.id);
              }
            });
          }
        })
        .then(results => resolve(results));
      }
    });
  };

  const deleteWallet = (args, opts, cb) => {
    opts = opts || {};

    const filename = args.file || process.env['WALLET_FILE'] || process.env['HOME'] + '/.walletsrc/.wallet.dat';
    const storage = new Storage({
      filename: filename,
    });

    return storage.delete(cb);
  };

  return {
    die,
    getClient,
    saveClient,
    deleteWallet,
    renderAmount,
    shortID,
    findOneTxProposal,
    renderTxProposals,
    processBatch
  };  
};
