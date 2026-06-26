.PHONY: start stop build test clean api ui logs-api logs-ui docker-up docker-down docker-build docker-logs docker-stop

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

docker-up:
	./start-docker.sh

docker-down:
	docker compose down

docker-build:
	docker compose build

docker-logs:
	docker compose logs -f

docker-stop:
	docker compose stop
