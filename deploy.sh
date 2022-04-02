#!/bin/bash

yarn build --base=/Francis-Powlesland1/klar/
cd dist
git init
git checkout -b gh-pages
git remote add origin git@github.ibm.com:Francis-Powlesland1/klar.git
git add .
git commit -m "deploy"
git push --force --set-upstream origin gh-pages
cd -