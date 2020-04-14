# Freshworks Development Kit

## Project Setup

You will need the following things properly installed on your computer.

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) Version >= 8 (with NPM)
* [Yarn](https://yarnpkg.com/en/)



1. Clone the repo and install the dependencies via
    ```
    git clone <repository-url>
    cd freshapps_sdk
    yarn install
    git submodule update --init --remote
    ```

## Packing the SDK

SDK contains CDN urls that must be changed for staging and production accordingly. A separate gulp task has been added to accomplish it.

Staging / Testing Build:

```bash
npm run pack-staging
```

Production Build:

```bash
npm run pack-production
```

## Run tests

Install mocha globally:

    npm install mocha -g

Run test:

    mocha test/
