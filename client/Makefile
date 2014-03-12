all: test

# the order of these files matters
SRC = src/core.js src/account.js src/session.js src/container.js \
	src/transaction.js src/peer.js src/message.js src/inbox.js \
	src/diff.js src/vendor/*.js

compile:
	./compile.sh --once

dist/crypton.js: $(SRC) node_modules
	@mkdir -p dist
	cat $(SRC) > dist/crypton.js

test: test-unit

test-unit: node_modules compile
	@./node_modules/karma/bin/karma start --browsers Firefox,PhantomJS --single-run

node_modules:
	npm install

clean:
	-rm -rf dist

.PHONY: test test-unit clean
