# pslplus (Public Suffix List)

This is a fork of the excellent [psl](https://www.npmjs.com/package/psl) module.

The reason for forking the original module was that the original psl parses the whole list including private domains in addition to ICANN published domains.

I needed a module that would only parse the ICANN part of the list (it is marked with `"===BEGIN ICANN DOMAINS==="` and `"===END ICANN DOMAINS==="`).

So this module has an option wether to include also provate domains or not.

Another option this module has is an update mechanism from code that updates the local list from the [public list from Mozilla](https://publicsuffix.org/).

In addition to the [original plugin's api](https://www.npmjs.com/package/psl) this module has the following methods:

### `update(options, callback)`

updates the local list from the online public list or from another source defined by options

* `options`: [optional] an object that may contain the following properties
 * `alsoPrivateDomains`: [optional boolean] if true will include the private part of the list. default is false.
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
