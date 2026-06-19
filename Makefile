.PHONY: start stop build test clean api ui logs-api logs-ui

start:
	./start.sh

stop:
	./stop.sh

build:
	./gradlew :api:compileKotlin
	cd ui && npx ng build

test:
	./gradlew :api:test

clean:
	./gradlew :api:clean
	cd ui && rm -rf build/

api:
	./gradlew :api:bootRun

ui:
	cd ui && npx ng serve --proxy-config proxy.conf.json --open

logs-api:
	tail -f /tmp/bioritmic-api.log

logs-ui:
	tail -f /tmp/bioritmic-ui.log
