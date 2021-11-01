.DEFAULT_GOAL := help
.PHONY: help git_hooks git_hooks_uninstall codeclimate

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

git_hooks: ## Set up git hooks.
	sudo chmod +x .hooks/*
	git config core.hooksPath ".hooks"

git_hooks_uninstall: ## Unset git hooks.
	git config --unset core.hooksPath

codeclimate: ## Run Codeclimate and generate report in html.
	docker run \
      --interactive --tty --rm \
      --env CODECLIMATE_CODE="$(shell pwd)" \
      --volume "$(shell pwd)":/code \
      --volume /var/run/docker.sock:/var/run/docker.sock \
      --volume /tmp/cc:/tmp/cc \
      codeclimate/codeclimate analyze -f html > report_codeclimate.html
