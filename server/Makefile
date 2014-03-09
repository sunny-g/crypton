test: test-unit

test-unit: clean node_modules
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec
test-debug: clean node_modules
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec -d --debug-brk

clean:
	$(MAKE) -C .. clean
	$(MAKE) -C .. setup-test-environment

node_modules:
	npm install

.PHONY: test test-unit clean
