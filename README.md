Library for parsing web-skype.
```
$ npm i my-skype-chat --save
```

Example:

```javascript
const MySkypeChat = require('my-skype-chat');

let skype = new MySkypeChat({
  login: 'my login',
  password: 'my password',
  browser: 'chrome',
  timingParse: 1500, // iteration time for parsing new messages
  limitSkypeHistory: 500, // if you accumulate 500 (default) messages then script reloads Skype's page.
});

skype.setChannel('SEOCAFE').then(() => { // Channel
  skype.setLastId(); // In order not to parse the story, we will simply find the last message.
  skype.onMessage((message) => { // Callback for new messages
    console.log(message);
  });
});
```

custom `skype.driver` (build browser), `skype.webdriver` (lib), `skype.By` (webdriver.By), `skype.util`(webdriver.util) 
```javascript
// save screenshot
skype.driver.takeScreenshot().then(function (image, err) {
      require('fs').writeFile(fileName + '.png', image, 'base64', function (err) {
        console.log(err);
      });
    });
```
