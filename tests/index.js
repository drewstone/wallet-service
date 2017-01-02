const { Wallet } = require('../');
const config = require('../config');

describe('Wallet Tests', () => {
  let wallet;

  before(done => {
    wallet = Wallet(config);
    done();
  });

  after(done => {
    wallet.deleteWallet({})
    .then(status => {
      done();
    });
  })

  it('should create a single key wallet', (done) => {
    wallet.createWallet({
      name: 'SingleBringle',
      copayer: 'null',
      mRequiredKeys: 1,
      nTotalKeys: 1,
      ext: {
        network: 'testnet'
      }
    })
    .then(res => {
      done();
    })
    .catch(done);
  });
});

