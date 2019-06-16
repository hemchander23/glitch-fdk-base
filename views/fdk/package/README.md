# Freshworks Development Kit

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


