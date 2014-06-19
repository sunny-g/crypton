all: test

# the order of these files matters
SRC = src/core.js src/account.js src/session.js src/container.js \
	src/transaction.js src/peer.js src/message.js src/inbox.js \
	src/diff.js src/fingerprintUtils.js src/vendor/*.js

compile:
	@./compile.sh --once

test: test-unit

test-unit: node_modules clean compile
	@echo "Running client tests..."
	@./node_modules/karma/bin/karma start --browsers PhantomJS --single-run

node_modules:
	@echo "Installing node modules for client testing..."
	@npm install

clean:
	@echo "Removing client compiled code..."
	-@rm -rf dist

.PHONY: compile test test-unit node_modules clean
