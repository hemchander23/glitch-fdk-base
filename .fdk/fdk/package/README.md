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

## How do i write tests for apps?

Create a folder called `test` in your app's root. Add mocha test files into this folder and call `fdk test`. Tests are run sequentially and code coverage is collected as expected. Only server folder can be tested for now. 

Mocha v5 framework is packed along with the fdk and test files can use any feature that mocha v5 supports. To ensure that writing tests are as practical as possible, we have also exposed two custom interfaces of our own via the mocha context.

Inside any before/beforeEach/after/afterEach/it contexts, two custom interfaces are exposed via the `this` variable. If you need any testing dependency for you tests, please install them globally for now. A new `devDependencies` field will be introduced in the `manifest.json` file to list testing dependencies.

### this.invoke(eventName:string, payload:json) => Promise
`invoke` accepts the event to be invoked as the first argument and the payload with which the event should be invoked as the second argument. It returns a Promise whihc resolves when the event callback successfully completes execution (irrespective of whether it successfully completed its task) and rejects when the callback itself fails (unhandled expection, syntax error).

### this.stub(interface:string, primitive:string) => SinonStub

`stub` is a abstraction around Sinon's stub method. Do read the sinon docs to understand more about them. Our `stub` expects the interface (`$db`, `$request`) and the primitive (`get`, `post`) within the interface to stub as part of the parameter list. It returns a sinon stub which can then be chained to behave as needed for the current test. Once can also restore the stub by calling the `stubbed.restore()` method as documented in the sinon docs.

A sample app with tests is available [here](https://github.com/freshdesk/freshapps_samples-pvt/tree/introspection/InsightCrew%20assignment_github_integration_app)
