# pslplus (Public Suffix List)

This is a fork of the excellent [psl](https://www.npmjs.com/package/psl) module.

The reason for forking the original module was that the original psl parses the whole list including private domains in addition to ICANN published domains.

I needed a module that would only parse the ICANN part of the list (it is marked with `"===BEGIN ICANN DOMAINS==="` and `"===END ICANN DOMAINS==="`).

So this module has an option wether to include also provate domains or not.

Another option this module has is an update mechanism from code that updates the local list from the [public list from Mozilla](https://publicsuffix.org/).

Lastly this module improves run time for parsing and validating domains.

In addition to the [original plugin's api](https://www.npmjs.com/package/psl) this module has the following methods:

### `update(options, callback)`

updates the local list from the online public list or from another source defined by options

* `options`: [optional] an object that may contain the following properties
 * `alsoPrivateDomains`: [optional boolean] if true will include the private part of the list, otherwise will include only icann public domains. default is true.
 * `url`: [optional string] if defined will be used as the source of the list to update from instead of the default hard coded address in this module which is [https://publicsuffix.org/list/effective_tld_names.dat](https://publicsuffix.org/list/effective_tld_names.dat)
* `callback`: [optional function(err)] a callback that will be called when the update process completes. If an error occured it will be passed and otherwise this callback will be called with no parameters indicating of success.

### `lastUpdated(callback)`

check how many days passed since the local list was last updated.

* `callback`: [function(err, days)] the callback will be called with an error if an error occured or with the number of days since the list was last updated.

## example

```javascript
var psl = require('pslplus');

var query = function() {
	console.log(psl.isValid("blogspot.com"));	//this will return true if private domains are not included and false otherwise since blogspot.com was registered by google.
}

psl.lastUpdated((err, days) => {
	if(err) {
		console.error(err);
	} else {
		if(days > 7) {
			//its been a week since we updated the list, updated it
			psl.update({
				alsoPrivateDomains: false	//you can play with this option to see the difference in the results
			}, (err) => {
				if(err) {
					console.error(err);
				} else {
					//now the list is updated and can be queried
					query();
				}
			});
		} else {
			query();
		}
	}
});
```


The rest of the API can be viewed in the original module's documentation: [psl](https://www.npmjs.com/package/psl)

### `psl.get(domain)`

Get domain name, `sld` + `tld`. Returns `null` if not valid.

#### Example:

```js
var psl = require('psl');

// null input.
psl.get(null); // null

// Mixed case.
psl.get('COM'); // null
psl.get('example.COM'); // 'example.com'
psl.get('WwW.example.COM'); // 'example.com'

// Unlisted TLD.
psl.get('example'); // null
psl.get('example.example'); // 'example.example'
psl.get('b.example.example'); // 'example.example'
psl.get('a.b.example.example'); // 'example.example'

// TLD with only 1 rule.
psl.get('biz'); // null
psl.get('domain.biz'); // 'domain.biz'
psl.get('b.domain.biz'); // 'domain.biz'
psl.get('a.b.domain.biz'); // 'domain.biz'

// TLD with some 2-level rules.
psl.get('uk.com'); // null);
psl.get('example.uk.com'); // 'example.uk.com');
psl.get('b.example.uk.com'); // 'example.uk.com');

// More complex TLD.
psl.get('c.kobe.jp'); // null
psl.get('b.c.kobe.jp'); // 'b.c.kobe.jp'
psl.get('a.b.c.kobe.jp'); // 'b.c.kobe.jp'
psl.get('city.kobe.jp'); // 'city.kobe.jp'
psl.get('www.city.kobe.jp'); // 'city.kobe.jp'

// IDN labels.
psl.get('食狮.com.cn'); // '食狮.com.cn'
psl.get('食狮.公司.cn'); // '食狮.公司.cn'
psl.get('www.食狮.公司.cn'); // '食狮.公司.cn'

// Same as above, but punycoded.
psl.get('xn--85x722f.com.cn'); // 'xn--85x722f.com.cn'
psl.get('xn--85x722f.xn--55qx5d.cn'); // 'xn--85x722f.xn--55qx5d.cn'
psl.get('www.xn--85x722f.xn--55qx5d.cn'); // 'xn--85x722f.xn--55qx5d.cn'
```

### `psl.isValid(domain)`

Check whether a domain has a valid Public Suffix. Returns a `Boolean` indicating
whether the domain has a valid Public Suffix.

#### Example

```js
var psl = require('psl');

psl.isValid('google.com'); // true
psl.isValid('www.google.com'); // true
psl.isValid('x.yz'); // false
```


## Testing and Building

Test are written using [`mocha`](https://mochajs.org/) and can be
run in two different environments: `node` and `phantomjs`.

```sh
# This will run `eslint`, `mocha` and `karma`.
npm test

# Individual test environments
# Run tests in node only.
./node_modules/.bin/mocha test
# Run tests in phantomjs only.
./node_modules/.bin/karma start ./karma.conf.js --single-run

# Build data (parse raw list) and create dist files
npm run build
```

Feel free to fork if you see possible improvements!


## Acknowledgements

* Mozilla Foundation's [Public Suffix List](https://publicsuffix.org/)
* Thanks to Rob Stradling of [Comodo](https://www.comodo.com/) for providing
  test data.
* Inspired by [weppos/publicsuffix-ruby](https://github.com/weppos/publicsuffix-ruby)

## License

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
