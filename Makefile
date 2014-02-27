
node_modules: package.json
	@npm install

server: node_modules
	@node test/server.js

test: node_modules
	@./node_modules/.bin/mocha test/index.js --reporter spec --bail

.PHONY: server test