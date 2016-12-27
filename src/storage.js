var fs = require('fs')

function Storage(opts) {
  if (!opts.filename) {
    throw new Error('Please set wallet filename');
  }
  this.filename = opts.filename;
  this.fs = opts.fs || fs;
};

Storage.prototype.getName = function() {
  return this.filename;
};

Storage.prototype.save = function(data, cb) {
  this.fs.writeFile(this.filename, JSON.stringify(data), cb);
};

Storage.prototype.load = function(cb) {
  this.fs.readFile(this.filename, 'utf8', function(err, data) {
    if (err) return cb(err);
    try {
      data = JSON.parse(data);
    } catch (e) {}
    return cb(null, data);
  });
};


module.exports = Storage;