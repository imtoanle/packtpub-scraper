const puppeteer = require('puppeteer');
const CREDS = require('./creds');

const USERNAME_SELECTOR = '#login-input-email';
const PASSWORD_SELECTOR = '#login-input-password';
const BUTTON_SELECTOR = '#login-form > form > button:nth-child(6)';

const fs = require("fs");
const mergePDF = require('easy-pdf-merge');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://subscription.packtpub.com/login', { waitUntil: 'networkidle2' });

  await page.waitForSelector('body > div.cc-window.cc-floating.cc-type-info.cc-theme-classic.cc-bottom.cc-right.cc-color-override-733698381 > div > a');

  await page.click('body > div.cc-window.cc-floating.cc-type-info.cc-theme-classic.cc-bottom.cc-right.cc-color-override-733698381 > div > a');

  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type(CREDS.username);

  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type(CREDS.password);

  await page.click(BUTTON_SELECTOR);

  await page.waitForNavigation();

  await page.goto('https://subscription.packtpub.com/book/application_development/9781789618921/24/ch24lvl1sec242/taking-input-from-devices', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    document.querySelector('body > div.page').style["backgroundColor"] = '#fff';
    document.querySelector('body').style["backgroundColor"] = '#fff';
    document.querySelector('body > div.page').style["paddingTop"] = 0;
  });

  var arrayPaths = [];
  var tempPath = '';
  var i = 1;

  var lastPageCheck = await page.evaluate(() => {
    let element = document.querySelector('[ng-click="productController.completeLastSection($event)"]');
    return !element || (element.offsetHeight == 0 && element.offsetWidth == 0);
  });

  while (lastPageCheck) {
    console.log('Dang render page ' + i);
    tempPath = 'page' + i + '.pdf';
    arrayPaths.push(tempPath);

    await page.waitForSelector('#reader-content > div:nth-child(2) > a.btn.btn-primary.pull-right.btn-lg.btn-block');

    await page.evaluate(() => {
      function removeElement(document, elementSelector) {
        // Removes an element from the document
        var element = document.querySelector(elementSelector);
        if(element !== null && element !== '') {
          element.parentNode.removeChild(element);
        }
      }
      removeElement(document, 'body > div.page > div.ng-scope > div.book-page-wrapper.ng-scope > div > div:nth-child(1) > div');
      removeElement(document, 'body > main-nav > nav > div > div.navbar-header');
      removeElement(document, '#sidebar-wrapper');
      removeElement(document, '#_hj_feedback_container');
      removeElement(document, 'body > main-nav');
      document.querySelector('#reader-content > div:nth-child(3)').style.display = 'none';
      document.querySelector('#reader-content > div:nth-child(2)').style.display = 'none';
    });

    await page.emulateMedia('screen');

    let height = await page.evaluate(() => document.documentElement.offsetHeight);

    await page.pdf({
      height: height + 'px',
      headerTemplate: "<p></p>",
      footerTemplate: "<p></p>",
      displayHeaderFooter: false,
      margin: {
        top: "10px",
        bottom: "30px"
      },
      printBackground: true,
      path: tempPath
    });

    var link = await page.$("#reader-content > div:nth-child(2) > a.btn.btn-primary.pull-right.btn-lg.btn-block");
    try {
      await page.evaluate((el) => { return el.click() }, link);
      await page.waitFor(1500);
    } catch (e) { console.log(e); }

    i = i+1;

    lastPageCheck = await page.evaluate(() => {
      let element = document.querySelector('[ng-click="productController.completeLastSection($event)"]');
      return !element || (element.offsetHeight == 0 && element.offsetWidth == 0);
    });
  }
  
  mergePDF(arrayPaths , 'full.pdf',function(err){
          if(err)
          return console.log(err);

          console.log('Success');
  });

  // const html = await page.content();
  // fs.writeFileSync("index.html", html);
  

  
  // await page.goto('http://kenh14.vn', { waitUntil: 'networkidle2' });
  // await page.screenshot({path: 'kenh14.png'});

  await browser.close();
})();