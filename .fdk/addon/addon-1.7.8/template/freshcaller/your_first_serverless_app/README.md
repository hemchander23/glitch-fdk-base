## Freshcaller App Project

Congratulations on creating your App Project! Feel free to replace this text with your project description.

### Project folder structure explained

    .
    ├── README.md                       This file.
    ├── config                          Installation parameter configs.
    │   ├── iparams.json                Installation parameter config in English language.
    │   └── iparam_test_data.json       Installation parameter data for local testing.
    └── manifest.json                   Project manifest.
    └── server                          Business logic for remote request and event handlers.
        ├── lib
        │   └── helper.js
        ├── server.js
        └── test_data                   Sample payloads for local testing
            ├── onAppInstall.json
            ├── onAppUninstall.json
            ├── onScheduledEvent.json
            ├── onExternalEvent.json
            ├── onCallCreate.json
            └── onCallUpdate.json
