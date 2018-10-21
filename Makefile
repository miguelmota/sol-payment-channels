all: build

.PHONY: build
build:
	@truffle compile

.PHONY: start/testrpc
start/testrpc:
	@ganache-cli -m "tape any present bunker crowd glance wire wine output noble crouch knock"

.PHONY: deploy
deploy:
	@truffle deploy

.PHONY: test
test:
	@truffle test
