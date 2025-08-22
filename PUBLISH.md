# Instructions on how to publish this package

  - addd a new version to to the CHANGELOG.md file
  - increase the version in the package.json file.
  - run `npm run ci`
  - run `npm run types`
  - commit all changes
  - create tag `git tag v1.0.0`
  - commit and push all changes `git push` and `git push --tags`
  - create a release on GitHub
  - publish `npm publish`
  