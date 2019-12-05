
NODE 	?= node
UNAME ?= $(shell uname)
CWD   ?= $(shell pwd)

ifneq ($(USER),root)
	SUDO = "sudo"
endif

.PHONY: dttyd dtty install install_dttyd

dttyd:
	$(NODE) --inspect=0.0.0.0:9226 dttyd.js -id test -h 127.0.0.1

dtty:
	$(NODE) --inspect=0.0.0.0:9227 dtty.js test@127.0.0.1

lc_link = if [ -d $1 ]; then \
	if [ -L $1 ]; then \
		rm node_modules/$(shell basename $1); \
	else \
		rm -rf node_modules/$(shell basename $1);\
	fi; \
	ln -s $1 node_modules/$(shell basename $1); \
fi

install:
	npm install --unsafe-perm
	$(SUDO) npm i -g --unsafe-perm
	@$(call lc_link,$(NGUI)/libs/nxkit)
	@$(call lc_link,$(CWD)/../crypto-tx)

install_dttyd: install
	cp dttyd.service /lib/systemd/system
	$(SUDO) systemctl enable dttyd
	$(SUDO) systemctl daemon-reload
