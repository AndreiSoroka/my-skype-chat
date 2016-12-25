require('chromedriver');
const webdriver = require('selenium-webdriver');
const By = webdriver.By;
const until = webdriver.until;

/**
 * @class
 */
class MySkypeChat {
  constructor({login = null, password = null, browser = 'chrome'}) {

    this.events = [];
    this.idParser = null;
    this.lastMessageId = null;

    this.driver = new webdriver.Builder()
      .forBrowser(browser)
      .build();

    if (login && password) {
      this.login(login, password);
    }
  }

  /**
   * login in skype
   * @param {string} login
   * @param {string} password
   */
  login(login, password) {
    this.driver.get('https://web.skype.com/ru/');
    this.driver.findElement(By.css('#username')).sendKeys(login);
    this.driver.findElement(By.css('#signIn')).click();
    this.driver.wait(until.elementLocated(By.id('i0118')), 5000);
    this.driver.findElement(By.css('#i0118')).sendKeys(password);
    this.driver.findElement(By.css('#idSIButton9')).click();
  }

  /**
   * @param {string} channel
   */
  setChannel(channel = '') {
    return new Promise((resolve, reject) => {
      let searchInput = By.css('.search.beforeMenuItems input[role="search"]');
      this.driver.wait(until.elementLocated(searchInput), 180000);

      let elSearchInput = this.driver.findElement(searchInput);
      this.driver.wait(until.elementIsVisible(elSearchInput), 25000);
      elSearchInput.sendKeys(channel);

      this.driver.sleep(3000);
      let channelMenuItem = this.driver.findElement(By.css(`h4 .topic[title="${channel}"]`));
      // this.driver.wait(until.elementIsVisible(channelMenuItem), 5000);
      channelMenuItem.click();
      channelMenuItem.getText().then(resolve, reject);
    })
  }

  /**
   *
   * @param message
   */
  sendMessage(message) {
    let _textarea = By.css('#chatInputAreaWithQuotes');
    this.driver.wait(until.elementLocated(_textarea), 5000);
    let $textarea = this.driver.findElement(_textarea);
    $textarea.click();
    $textarea.sendKeys(message);
    let _button = By.css('.upper-row-form .send-button-holder button');
    this.driver.findElement(_button).click();
  }

  onMessage(callback) {
    this.events.push(callback);
    this._parser();
  }

  offMessage(callback) {
    let index = this.events.indexOf(callback);
    if (index != -1) {
      this.events.splice(index, 1);
    }
    this._parser();
  }

  setLastId() {
    this._parseMessages().then((messages) => {
      this.lastMessageId = messages[0].id;
    });
  }

  _parser() {
    if (!this.events.length) {
      clearTimeout(this.idParser);
      return;
    }
    if (this.idParser) {
      return;
    }
    this._parseMessages().then((messages) => {
      if (messages.length == 0) {
        return;
      }

      let messageLength = messages.length;
      let messageResult = [];
      for (let i = 0; i < messageLength; ++i) {
        let message = messages[i];
        if (!messages || !message.id) {
          continue;
        }
        if (this.lastMessageId == message.id) {
          break;
        }

        messageResult.push(message);
      }
      messageResult.reverse();
      messageResult.forEach((message) => {
        this._sendEvents(message);
      });

      // last message id
      this.lastMessageId = messages[0].id;
    });

    this.idParser = setTimeout(() => {
      this.idParser = null;
      this._parser();
    }, 7000);
  }

  _parseMessages() {
    return this.driver.findElements(By.css('.messageHistory swx-message')).then((elements_arr) => {
      console.log('parse elements:', elements_arr.length);
      let results = [];
      let p = Promise.resolve(results);
      for (let i = elements_arr.length - 1; i >= 0; --i) {
        p = p.then((r) => {
          return this._parseMessage(elements_arr[i]).then((message) => {
            r.push(message);
            return r;
          });
        });
      }
      return p;
    })
  }

  /**
   * Get id, text message, author name
   * @param message
   * @returns {Promise.<TResult>}
   * @private
   */
  _parseMessage(message) {
    return Promise.all([
      message.getAttribute('data-id'),
      message.findElement(By.className('content')),
      // message.findElement(By.css('.tileName h4'))
    ]).then(results => {
      let id = results[0];
      return Promise.all([
        results[1].getText(),
        // results[2].getText()
      ]).then((results2) => {
        return {id, message: results2[0]}; //, user: results2[1]}
      });
    })
  }

  _sendEvents(message) {
    this.events.forEach((callback) => {
      if (callback && typeof callback == 'function') {
        callback(message);
      }
    });
  }
}

module.exports = MySkypeChat;
