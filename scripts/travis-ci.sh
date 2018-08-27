#!/bin/bash
if [ "$TRAVIS_OS_NAME" == "linux" ]; then
    docker build --tag bitbox-2fa-app-ci -f Dockerfile.travis .;
fi

if [ "$TRAVIS_OS_NAME" == "osx" ]; then
    ./scripts/osx-prep.sh;
    browserify www/js/main_new.js -o www/js/app_new.js && \
        browserify www/js/init.js -o www/js/app_init.js && \
        browserify www/js/main_old.js -o www/js/app_old.js
    cordova build browser
    cordova build ios
fi
