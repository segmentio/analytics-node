# Binaries.
browserify = ./node_modules/.bin/browserify
ava = ./node_modules/.bin/ava
nsp = ./node_modules/.bin/nsp
standard = ./node_modules/.bin/standard

# Install the node module dependencies.
node_modules: yarn.lock
	yarn
	touch $@

# Run the tests.
test: node_modules
	@$(ava)

lint: node_modules
	$(standard)

nsp:
	@$(nsp) check

# Phonies.
.PHONY: test lint nsp
