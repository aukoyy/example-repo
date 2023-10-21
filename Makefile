YARN_TARGETS := lint build start test

help:
	@echo "Targets:"
	@echo "  $(YARN_TARGETS)"
	@echo "  psql"
	@echo "  up"

%/node_modules: %/package.json %/yarn.lock
	@yarn --silent --cwd $* install

PHONY: $(YARN_TARGETS)
$(YARN_TARGETS): app/example/node_modules
	@yarn --silent --cwd app/example $@

.PHONY: psql
psql:
	docker-compose exec database psql -U user -d orders

.PHONY: up
up:
	docker-compose up
