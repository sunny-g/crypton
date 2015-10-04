test: test-unit

test-unit: reset node_modules
	@echo "Running server tests..."
	@NODE_ENV=test ./node_modules/mocha/bin/mocha --reporter spec

test-debug: reset node_modules
	@echo "Running server tests with debugger..."
	@NODE_ENV=test ./node_modules/mocha/bin/mocha --reporter spec -d --debug-brk

reset:
	@$(MAKE) -C .. reset

node_modules:
	@echo "Installing node modules for server..."
	@npm install

.PHONY: test test-unit test-debug reset node_modules
