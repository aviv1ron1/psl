/*eslint no-var:0, prefer-arrow-callback: 0 */
'use strict';


const Punycode = require('punycode');
const Fs = require('fs');
const Path = require('path');
const Request = require('request');
const EventStream = require('event-stream');
const JSONStream = require('JSONStream');
const Moment = require('moment');
const Util = require('util');

const icannRegex = /===(BEGIN|END) ICANN DOMAINS===/;

var internals = {};

internals.alsoPrivateDomains = true;
internals.icannMode = false;

internals.isDefined = function(x) {
    return !Util.isNullOrUndefined(x);
}

internals.src = 'https://publicsuffix.org/list/effective_tld_names.dat';
internals.dest = Path.join(__dirname, 'data', 'rules.json');

//
// Parse line (trim and ignore empty lines and comments).
//
internals.parseLine = function(line, cb) {

    const trimmed = line.trim();

    // Ignore empty lines and comments.
    if (!trimmed) {
        return cb();
    }
    if (trimmed.charAt(0) === '/' && trimmed.charAt(1) === '/') {
        if (!internals.alsoPrivateDomains && icannRegex.test(trimmed)) {
            internals.icannMode = !internals.icannMode;
        }
        return cb();
    }

    // Only read up to first whitespace char.
    const rule = trimmed.split(' ')[0];
    if (internals.alsoPrivateDomains || internals.icannMode) {
        return cb(null, rule);
    } else {
        return cb();
    }

};



//
// Read rules from file.
//
internals.getRules = function() {
    try {
        var rules = require('./data/rules.json');
    } catch (err) {
        rules = [];
    }
    internals.rules = rules.map(function(rule) {
        var r = {
            rule: rule,
            suffix: rule.replace(/^(\*\.|\!)/, ''),
            wildcard: rule.charAt(0) === '*',
            exception: rule.charAt(0) === '!'
        };
        r.punySuffix = Punycode.toASCII(r.suffix);
        return r;
    });
};

internals.getRules();

//
// Check is given string ends with `suffix`.
//
internals.endsWith = function(str, suffix) {

    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};


//
// Find rule for a given domain.
//
internals.findRule = function(domain) {

    var punyDomain = Punycode.toASCII(domain);
    return internals.rules.reduce(function(memo, rule) {

        //var punySuffix = Punycode.toASCII(rule.suffix);
        if (!internals.endsWith(punyDomain, '.' + rule.punySuffix) && punyDomain !== rule.punySuffix) {
            return memo;
        }
        // This has been commented out as it never seems to run. This is because
        // sub tlds always appear after their parents and we never find a shorter
        // match.
        //if (memo) {
        //  var memoSuffix = Punycode.toASCII(memo.suffix);
        //  if (memoSuffix.length >= punySuffix.length) {
        //    return memo;
        //  }
        //}
        return rule;
    }, null);
};

//
// Error codes and messages.
//
exports.errorCodes = {
    DOMAIN_TOO_SHORT: 'Domain name too short.',
    DOMAIN_TOO_LONG: 'Domain name too long. It should be no more than 255 chars.',
    LABEL_STARTS_WITH_DASH: 'Domain name label can not start with a dash.',
    LABEL_ENDS_WITH_DASH: 'Domain name label can not end with a dash.',
    LABEL_TOO_LONG: 'Domain name label should be at most 63 chars long.',
    LABEL_TOO_SHORT: 'Domain name label should be at least 1 character long.',
    LABEL_INVALID_CHARS: 'Domain name label can only contain alphanumeric characters or dashes.',
    LABEL_ERROR: 'Domain name is invalid'
};


//
// Validate domain name and throw if not valid.
//
// From wikipedia:
//
// Hostnames are composed of series of labels concatenated with dots, as are all
// domain names. Each label must be between 1 and 63 characters long, and the
// entire hostname (including the delimiting dots) has a maximum of 255 chars.
//
// Allowed chars:
//
// * `a-z`
// * `0-9`
// * `-` but not as a starting or ending character
// * `.` as a separator for the textual portions of a domain name
//
// * http://en.wikipedia.org/wiki/Domain_name
// * http://en.wikipedia.org/wiki/Hostname
//
internals.validate = function(input) {

    // Before we can validate we need to take care of IDNs with unicode chars.
    var ascii = Punycode.toASCII(input);

    if (ascii.length < 1) {
        return 'DOMAIN_TOO_SHORT';
    }
    if (ascii.length > 255) {
        return 'DOMAIN_TOO_LONG';
    }



    if (!/^(?:[a-z0-9]{1}([a-z0-9\-]{0,61}[a-z0-9]){0,1}\.)+[a-z0-9]{1}(?:[a-z0-9\-]{0,60}[a-z0-9]){0,1}\.?$/.test(ascii)) {
        //Check each part's length and allowed chars.
        var labels = ascii.split('.');
        var label;

        for (var i = 0; i < labels.length; ++i) {
            label = labels[i];
            if (!label.length) {
                return 'LABEL_TOO_SHORT';
            }
            if (label.length > 63) {
                return 'LABEL_TOO_LONG';
            }
            if (label.charAt(0) === '-') {
                return 'LABEL_STARTS_WITH_DASH';
            }
            if (label.charAt(label.length - 1) === '-') {
                return 'LABEL_ENDS_WITH_DASH';
            }
            if (!/^[a-z0-9\-]+$/.test(label)) {
                return 'LABEL_INVALID_CHARS';
            }
        }
    }
};

//
// Public API
//

//
// Parse domain.
//
exports.parse = function(input) {

    if (typeof input !== 'string') {
        throw new TypeError('Domain name must be a string.');
    }

    // Force domain to lowercase.
    var domain = input.slice(0).toLowerCase();

    // Handle FQDN.
    // TODO: Simply remove trailing dot?
    if (domain.charAt(domain.length - 1) === '.') {
        domain = domain.slice(0, domain.length - 1);
    }

    // Validate and sanitise input.
    var error = internals.validate(domain);
    if (error) {
        return {
            input: input,
            error: {
                message: exports.errorCodes[error],
                code: error
            }
        };
    }

    var parsed = {
        input: input,
        tld: null,
        sld: null,
        domain: null,
        subdomain: null,
        listed: false
    };

    var domainParts = domain.split('.');

    // Non-Internet TLD
    if (domainParts[domainParts.length - 1] === 'local') {
        return parsed;
    }

    var handlePunycode = function() {

        if (!/xn--/.test(domain)) {
            return parsed;
        }
        if (parsed.domain) {
            parsed.domain = Punycode.toASCII(parsed.domain);
        }
        if (parsed.subdomain) {
            parsed.subdomain = Punycode.toASCII(parsed.subdomain);
        }
        return parsed;
    };

    var rule = internals.findRule(domain);

    // Unlisted tld.
    if (!rule) {
        if (domainParts.length < 2) {
            return parsed;
        }
        parsed.tld = domainParts.pop();
        parsed.sld = domainParts.pop();
        parsed.domain = [parsed.sld, parsed.tld].join('.');
        if (domainParts.length) {
            parsed.subdomain = domainParts.pop();
        }
        return handlePunycode();
    }

    // At this point we know the public suffix is listed.
    parsed.listed = true;

    var tldParts = rule.suffix.split('.');
    var privateParts = domainParts.slice(0, domainParts.length - tldParts.length);

    if (rule.exception) {
        privateParts.push(tldParts.shift());
    }

    if (!privateParts.length) {
        return handlePunycode();
    }

    if (rule.wildcard) {
        tldParts.unshift(privateParts.pop());
    }

    if (!privateParts.length) {
        return handlePunycode();
    }

    parsed.tld = tldParts.join('.');
    parsed.sld = privateParts.pop();
    parsed.domain = [parsed.sld, parsed.tld].join('.');

    if (privateParts.length) {
        parsed.subdomain = privateParts.join('.');
    }

    return handlePunycode();
};


//
// Get domain.
//
exports.get = function(domain) {

    if (!domain) {
        return null;
    }
    return exports.parse(domain).domain || null;
};


//
// Check whether domain belongs to a known public suffix.
//
exports.isValid = function(domain) {
    var parsed = exports.parse(domain);
    return Boolean(parsed.domain && parsed.listed);
};


//
// return how many days passed since last updated the list
//
exports.lastUpdated = function(callback) {
    Fs.stat(internals.dest, function(err, stats) {
        if (err) {
            callback(err);
        } else {
            callback(null, Moment().diff(stats.mtime, 'days'));
        }
    })
}

//
// update the public suffix list from the internet
//
exports.update = function(options, callback) {
    if (internals.isDefined(options)) {
        if (typeof options === "function") {
            callback = options;
        } else {
            if (internals.isDefined(options.alsoPrivateDomains)) {
                internals.alsoPrivateDomains = options.alsoPrivateDomains;
            }
            if (internals.isDefined(options.url)) {
                internals.src = options.url;
            }
        }
    }
    if (!internals.isDefined(callback)) {
        callback = function(err) {
            if (err) {
                console.error(err);
            }
        };
    }
    Request(internals.src)
        .pipe(EventStream.split())
        .pipe(EventStream.map(internals.parseLine))
        .pipe(JSONStream.stringify('[', ',', ']'))
        .pipe(Fs.createWriteStream(internals.dest))
        .on('finish', function() {
            internals.getRules();
            callback();
        })
        .on('error', function(err) {
            callback(err);
        });
}
