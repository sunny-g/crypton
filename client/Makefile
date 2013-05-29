all: test

# the order of these files matters
SRC = src/core.js src/account.js src/session.js src/container.js \
	src/transaction.js src/peer.js src/message.js src/diff.js src/vendor/*.js

dist/crypton.min.js: dist/crypton.js
	./node_modules/.bin/uglifyjs dist/crypton.js > dist/crypton.min.js

dist/crypton.js: $(SRC) node_modules
	@mkdir -p dist
	cat $(SRC) > dist/crypton.js

test: test-unit

test-unit: node_modules dist/crypton.js
	@./node_modules/.bin/karma start --browsers Firefox,PhantomJS --single-run

node_modules:
	npm install karma
	npm install uglify-js

clean:
	-rm -rf dist

.PHONY: test test-unit clean
