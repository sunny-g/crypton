test: test-unit

test-unit: reset node_modules
	@echo "Running server tests..."
	@./node_modules/mocha/bin/mocha -R spec

test-debug: reset node_modules
	@echo "Running server tests with debugger..."
	@./node_modules/mocha/bin/mocha -R spec -d --debug-brk

reset:
	@$(MAKE) -C .. reset

node_modules:
	@echo "Installing node modules for server..."
	@npm install &> /dev/null

.PHONY: test test-unit test-debug reset node_modules
