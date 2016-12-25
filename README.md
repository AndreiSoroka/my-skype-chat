Library for parsing web-skype.
```
$ npm i my-skype-chat --save
```

Example:

```javascript
const MySkypeChat = require('my-skype-chat');

let skype = new MySkypeChat({
  login: 'my login', // Логин скайпа. Важно для входа.
  password: 'my password', // Пароль скайпа. Важно для входа.
  browser: 'chrome', // Браузер. Дефолтно chrome
  timingParse: 1500, // Время итерации для сбора сообщений. Дефолтно 1500мс
  limitSkypeHistory: 500, // Через какое кол-во сообщений в истории скайпа перезагрузить страницу. Дефолтно 500
});

skype.setChannel('SEOCAFE').then(() => { // Какой канал будем парсить
  skype.setLastId(); // Чтобы не парсить историю, мы просто найдем последнее сообщение.
  skype.onMessage((message) => { // Callback на новое сообщение.
    console.log(message);
  });
});
```
