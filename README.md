## Your First Freshchat App on Glitch

Congratulations on creating your first app! Feel free to replace this text with your app's actual description.

1. You can modify the glitch app here. 
2. Make sure to run the proxy script locally to connect this app to your freshchat tenant


### Folder structure explained

    .
    ├── README.md                  This file
    ├── app                        Contains the files that are required for the front end component of the app
    │   ├── app.js                 JS to render the dynamic portions of the app
    │   ├── icon.svg               Sidebar icon SVG file. Should have a resolution of 64x64px.
    │   ├── freshchat_logo.png     The Freshchat logo that is displayed in the app
    │   ├── style.css              Style sheet for the app
    │   ├── template.html          Contains the HTML required for the app’s UI
    ├── config                     Contains the installation parameters and OAuth configuration
    │   ├── iparams.json           Contains the parameters that will be collected during installation
    │   └── iparam_test_data.json  Contains sample Iparam values that will used during testing
    └── manifest.json              Contains app meta data and configuration information
    
1. To make sure this app runs, hit `http://<GLITCH_APP_NAME>.glitch.me/iframe/api` in the browser. It will throw a metadata json.        
2. To link this app to your freshchat account, run this script locally: 

```
// Maintain FW_GLITCH_USER and FW_GLITCH_PASSWORD in the .env file of your Glitch project
var express = require('express');
var proxy = require('http-proxy-middleware');

var app = express();

app.use(
    '**',
    proxy({
        ws: true,
        target: 'http://<GLITCH_APP_NAME>.glitch.me',
        changeOrigin: true,
        auth: '<FW_GLITCH_USER>:<FW_GLITCH_PASSWORD>'
    })
);
app.listen(10001);

```