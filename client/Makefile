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

KARMA_PATH= `[ "$$TRAVIS" = true ] && echo "./node_modules/.bin/karma" || echo "./node_modules/karma/bin/karma"`
test-unit: node_modules compile
	@echo ${KARMA_PATH}
	@${KARMA_PATH} start --browsers PhantomJS --single-run

node_modules:
	npm install

clean:
	-rm -rf dist

.PHONY: test test-unit clean
