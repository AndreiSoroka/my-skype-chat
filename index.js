const webdriver = require('selenium-webdriver');
const By = webdriver.By;
const until = webdriver.until;

let phantomjs = webdriver.Capabilities.phantomjs();
let chrome = require('selenium-webdriver/chrome');

/**
 * @class
 */
class MySkypeChat {
  /**
   * @constructor
   * @param {string} login
   * @param {string} password
   * @param {string} browser
   * @param {number} timingParse
   * @param {number} limitSkypeHistory
   */
  constructor({
    login = null,
    password = null,
    browser = 'phantomjs',
    timingParse = 1500,
    limitSkypeHistory = 500,
  }) {
    this.By = By;
    this.until = until;
    this.webdriver = webdriver;

    switch (browser) {
      case 'phantomjs':
        phantomjs.set("phantomjs.binary.path", require('phantomjs-prebuilt').path);
        this.driver = new webdriver.Builder()
          .withCapabilities(phantomjs)
          .build();
        this.driver.manage().window().maximize();
        break;
      case 'chrome':
        chrome.setDefaultService(new chrome.ServiceBuilder(require('chromedriver').path).build());
        this.driver = new webdriver.Builder()
          .forBrowser('chrome')
          .build();
        this.driver.manage().window().setSize(700, 800);
        break;
      default:
        console.error('I don\'t know browser', browser);
        return;
    }

    this.events = {
      onMessage: []
    };
    this.idParser = null;
    this.timingParse = timingParse;
    this.lastMessageId = null;
    this.lastUser = null;
    this.limitSkypeHistory = limitSkypeHistory;

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
   * Refresh skype page
   */
  refresh() {
    console.log('>! stop parser');
    console.log('reload skype page');
    clearTimeout(this.idParser);

    // wait all promises :)
    this.driver.sleep(1500);
    this.driver.navigate().refresh();
    this.setChannel(this.channel).then(() => {
      console.log('>! start skype parser');
      this.idParser = null;
      this._parser();
    });
  }

  /**
   * Set channel in skype
   * @param {string} channel
   */
  setChannel(channel = '') {
    this.channel = channel;
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
   * Send message in skype
   * @param message
   */
  sendMessage(message) {
    let _textarea = By.css('#chatInputAreaWithQuotes');
    this.driver.wait(until.elementLocated(_textarea), 5000);
    let $textarea = this.driver.findElement(_textarea);
    this.driver.wait(until.elementIsVisible($textarea), 25000);
    $textarea.click();
    $textarea.sendKeys(message);
    let _button = By.css('.upper-row-form .send-button-holder button');
    this.driver.findElement(_button).click();
  }

  /**
   * Add trigger on new message
   * @param {Function} callback
   */
  onMessage(callback) {
    this.events.onMessage.push(callback);
    this._parser();
  }

  /**
   * Remove trigger
   * @param {Function} callback
   */
  offMessage(callback) {
    let index = this.events.onMessage.indexOf(callback);
    if (index != -1) {
      this.events.onMessage.splice(index, 1);
    }
    this._parser();
  }

  /**
   * Set {@see this.lastMessageId }
   * @returns {Promise.<TResult>|!Thenable.<R>|*}
   */
  setLastId() {
    return this._parseMessages().then((messages) => {
      this.lastMessageId = messages[0].id;
    });
  }

  _parser() {
    if (!this.events.onMessage.length) {
      clearTimeout(this.idParser);
      this.idParser = null;
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
    }, this.timingParse);
  }

  _parseMessages() {
    return this.driver.findElements(By.css('.messageHistory swx-message')).then((elements_arr) => {
      console.log('parse elements:', elements_arr.length);
      if (elements_arr.length > this.limitSkypeHistory) {
        this.refresh();
      }
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
      message.getAttribute('class')
      // message.findElement(By.css('.tileName h4'))
    ]).then(results => {
      // let id = results[0];
      let arrayPromise = [
        results[0],
        results[1].getText()
      ];
      let className = results[2].split(" ");
      if (className.indexOf('me') != -1) {
        arrayPromise.push(null);
        arrayPromise.push(true);
      } else if (className.indexOf('first') != -1 && className.indexOf('me') == -1) {
        arrayPromise.push(message.findElement(By.css('.tileName h4')).getText());
        arrayPromise.push(false);
      }
      return Promise.all(arrayPromise).then((results2) => {
        let answer = {};
        answer.id = results2[0];
        answer.message = results2[1];
        answer.user = results2[2];
        answer.isBot = results2[3];

        if (answer.isBot) {
          this.lastUser = null;
        } else if (!answer.user && !answer.isBot && this.lastUser) {
          answer.user = this.lastUser;
        } else if (answer.user) {
          this.lastUser = answer.user;
        }
        return answer;
      });
    })
  }

  _sendEvents(message) {
    this.events.onMessage.forEach((callback) => {
      if (callback && typeof callback == 'function') {
        callback(message);
      }
    });
  }
}

module.exports = MySkypeChat;
