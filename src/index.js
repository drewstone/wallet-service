const WalletService = require('./wallet');

module.exports = (config) => {
  return {
    WalletService: WalletService(config)
  };
};
