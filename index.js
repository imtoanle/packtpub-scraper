const puppeteer = require('puppeteer');
const CREDS = require('./creds');

const USERNAME_SELECTOR = '#login-input-email';
const PASSWORD_SELECTOR = '#login-input-password';
const BUTTON_SELECTOR = '#login-form > form > button:nth-child(6)';

const mergePDF = require('easy-pdf-merge');
const path = require("path");

async function createFirstPagePDF(page){
  var milis = new Date();
  milis = milis.getTime();

  console.log('Rendering First Page');
  var pdfPath = path.join('pdf', `first-page-${milis}.pdf`);

  await page.waitForSelector('#book-wrapper > div > div > div > div.button-group.text-right.ng-scope > a');

  await page.emulateMedia('screen');
  await page.pdf({
    height: (await page.evaluate(() => document.documentElement.offsetHeight)) + 'px',
    headerTemplate: "<p></p>",
    footerTemplate: "<p></p>",
    displayHeaderFooter: false,
    margin: {
      top: "10px",
      bottom: "30px"
    },
    printBackground: true,
    path: pdfPath
  });

  return pdfPath;
}

async function createPDF(page){
  var milis = new Date();
  milis = milis.getTime();
  var pageTitle = await page.evaluate(() => {
    element = document.querySelector('#reader-content > div:nth-child(1) > div.book-content > div.ng-binding > div > div.titlepage > div > div > h2');
    if(element !== null && element !== '') {
      return element.innerText;
    } else {
      return window.location.pathname;
    }
    
  });

  console.log('Rendering page title: ' + pageTitle);
  var pdfPath = path.join('pdf', `page-${milis}.pdf`);

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
  await page.pdf({
    height: (await page.evaluate(() => document.documentElement.offsetHeight)) + 'px',
    headerTemplate: "<p></p>",
    footerTemplate: "<p></p>",
    displayHeaderFooter: false,
    margin: {
      top: "10px",
      bottom: "30px"
    },
    printBackground: true,
    path: pdfPath
  });

  var link = await page.$("#reader-content > div:nth-child(2) > a.btn.btn-primary.pull-right.btn-lg.btn-block");
  try {
    await page.evaluate((el) => { return el.click() }, link);
    await page.waitFor(1500);
  } catch (e) { console.log(e); }

  return pdfPath;
}

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

  // Get Page 1
  await page.goto('https://subscription.packtpub.com/book/application_development/9781789618921', { waitUntil: 'networkidle2' });
  var arrayPaths = [await createFirstPagePDF(page)];

  // Get lession 1
  await page.goto('https://subscription.packtpub.com/book/application_development/9781789618921/1', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    document.querySelector('body > div.page').style["backgroundColor"] = '#fff';
    document.querySelector('body').style["backgroundColor"] = '#fff';
    document.querySelector('body > div.page').style["paddingTop"] = 0;
  });

  var lastPageCheck = await page.evaluate(() => {
    let element = document.querySelector('[ng-click="productController.completeLastSection($event)"]');
    return !element || (element.offsetHeight == 0 && element.offsetWidth == 0);
  });

  while (lastPageCheck) {
    arrayPaths.push(await createPDF(page));

    lastPageCheck = await page.evaluate(() => {
      let element = document.querySelector('[ng-click="productController.completeLastSection($event)"]');
      return !element || (element.offsetHeight == 0 && element.offsetWidth == 0);
    });
  }
  
  mergePDF(arrayPaths , 'odoo-12-development-cookbook.pdf',function(err){
          if(err)
          return console.log(err);

          console.log('Success');
  });

  await browser.close();
})();