(function(e){if("function"==typeof bootstrap)bootstrap("reconnect",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeReconnect=e}else"undefined"!=typeof window?window.reconnect=e():global.reconnect=e()})(function(){var define,ses,bootstrap,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Reconnect;

Reconnect = (function() {
  var defaults;

  Reconnect.prototype.defaults = {
    allowedReconnectionAttempts: Infinity,
    reconnectDelay: 1000,
    reconnectTimeout: 60 * 1000
  };

  function Reconnect(io, options) {
    if (options == null) {
      options = {};
    }
    if (!(this instanceof Reconnect)) {
      return new Reconnect(io, options);
    }
    this.io = arguments[0], this.options = arguments[1];
    this.setup();
    this.mutateIO();
    this.resetReconnect();
    return this.io;
  }

  Reconnect.prototype.setup = function() {
    this.timeouts = {};
    this.options = defaults(this.options, this.defaults);
    return this.flags = {
      isConnected: false,
      skipReconnect: false,
      isAttemptingReconnect: false,
      neverConnected: true
    };
  };

  Reconnect.prototype.mutateIO = function() {
    var event, _i, _len, _ref, _ref1;
    _ref = [this.io.close.bind(this.io), this.close.bind(this)], this.ioClose = _ref[0], this.io.close = _ref[1];
    this.io.reconnect = this.reconnect.bind(this);
    _ref1 = ['Close', 'Open', 'Error'];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      event = _ref1[_i];
      this.io.on(event.toLowerCase(), this["on" + event].bind(this));
    }
    return null;
  };

  Reconnect.prototype.close = function() {
    this.resetReconnect();
    this.flags.skipReconnect = true;
    return this.ioClose();
  };

  Reconnect.prototype.resetReconnect = function() {
    this.clearTimeouts();
    this._reconnectAttempts = 0;
    this.flags.skipReconnect = false;
    return this.flags.isAttemptingReconnect = false;
  };

  Reconnect.prototype.clearTimeouts = function() {
    var name, timeout, _ref;
    _ref = this.timeouts;
    for (name in _ref) {
      timeout = _ref[name];
      clearTimeout(timeout);
      this.timeouts[name] = null;
    }
    return null;
  };

  Reconnect.prototype.onOpen = function() {
    var attempt;
    this.flags.neverConnected = false;
    this.flags.isConnected = true;
    if (!this.flags.isAttemptingReconnect) {
      return;
    }
    attempt = this._reconnectAttempts;
    this.resetReconnect();
    return this.io.emit('reconnect', attempt);
  };

  Reconnect.prototype.onClose = function() {
    this.flags.isConnected = false;
    if (this.flags.skipReconnect) {
      return this.resetReconnect();
    } else {
      return this.reconnect();
    }
  };

  Reconnect.prototype.onError = function(error) {
    if (this.flags.isAttemptingReconnect) {
      this.io.emit('reconnect_error', error);
    }
    if ((this.flags.neverConnected || this.flags.isAttemptingReconnect) && !this.flags.skipReconnect) {
      return this.reconnect();
    }
  };

  Reconnect.prototype.reconnect = function() {
    var delay;
    if (this.flags.isConnected) {
      return;
    }
    if (this._reconnectAttempts > this.options.allowedReconnectionAttempts) {
      this.io.close();
      this.io.emit('reconnect_failed');
    } else {
      this.io.emit('reconnecting', this._reconnectAttempts);
      this.flags.isAttemptingReconnect = true;
      delay = this._reconnectAttempts * this.options.reconnectDelay;
      this.timeouts.reconnect = setTimeout(this.attemptConnect.bind(this), delay);
    }
    return this._reconnectAttempts++;
  };

  Reconnect.prototype.onConnectionTimeout = function() {
    this.close();
    return this.io.emit('reconnect_timeout', this.options.reconnectTimeout);
  };

  Reconnect.prototype.attemptConnect = function() {
    var method;
    this.io.open();
    if (this.options.reconnectTimeout !== false && !this.timeouts.connect) {
      method = this.onConnectionTimeout.bind(this);
      return this.timeouts.connect = setTimeout(method, this.options.reconnectTimeout);
    }
  };

  defaults = function(object) {
    var key, source, value, _i, _len, _ref;
    _ref = Array.prototype.slice.call(arguments, 1);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      source = _ref[_i];
      if (!source) {
        return;
      }
      for (key in source) {
        value = source[key];
        if (object[key] == null) {
          object[key] = value;
        }
      }
    }
    return object;
  };

  if (!Function.prototype.bind) {
    Function.prototype.bind = function(context) {
      var args, boundFunction, fNOP, functionToBind;
      if (typeof this !== 'function') {
        throw new TypeError('Function.prototype.bind - improper arguments');
      }
      args = Array.prototype.slice.call(arguments, 1);
      functionToBind = this;
      fNOP = function() {};
      boundFunction = function() {
        context = this instanceof fNOP ? this : conext;
        return functionToBind.apply(context, args.concat(Array.prototype.slice.call(arguments)));
      };
      fNOP.prototype = this.prototype;
      boundFunction.prototype = new fNOP();
      return boundFunction;
    };
  }

  return Reconnect;

})();

module.exports = Reconnect;

},{}]},{},[1])
(1)
});
;