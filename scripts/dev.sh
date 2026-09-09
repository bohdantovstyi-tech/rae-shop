#!/usr/bin/env bash
# Локальна розробка: netlify dev --live
# Піднімає статику з public/, функції з netlify/functions/ і публічний тунель
# (тунель потрібен, щоб WayForPay міг достукатись до wfp-callback ззовні).
# Збірки немає — public/app.js віддається як є.
set -e

netlify dev --live
