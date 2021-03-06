const puppeteer = require("puppeteer");
const sitemaps = require("sitemap-stream-parser");
const fs = require("fs");
const program = require("commander");
const readline = require("readline");

const { version } = require("./package.json");

/**
 * Create output folder if it does not exist.
 *
 * @param {String} outputFolder
 */
const createOutputFolder = outputFolder => {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }
};

/**
 * Fetches urls from sitemap url.
 *
 * @param {String} siteMapUrl
 * @returns {Promise}
 */
const getUrlsFromSiteMap = siteMapUrl => {
  return new Promise((resolve, reject) => {
    if (!siteMapUrl) {
      reject("No sitemap url specified.");
      return;
    }

    console.log("Getting urls from sitemap: " + siteMapUrl);

    try {
      const sitemapUrls = [];
      sitemaps.parseSitemaps(
        siteMapUrl,
        url => sitemapUrls.push(url),
        err => {
          if (err || !sitemapUrls.length) {
            reject("No urls could be found for given sitemap: " + siteMapUrl);
            return;
          }
          console.log("Found " + sitemapUrls.length + " urls");
          resolve(sitemapUrls);
        }
      );
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Sanitizes a filename by replacing all characters other than letters and numbers with "_".
 *
 * @param {String} s - the string to sanitize
 */
const sanitizeFilename = s => s.replace(/[^a-z0-9]/gi, "_").toLowerCase();

/**
 * Generates the pdf files.
 *
 * @param {Array} urls
 * @param {String} outputFolder
 */
const generatePdfsFromUrls = async (urls, outputFolder) => {
  if (!urls || !urls.length) {
    throw new Error("No urls could be found.");
  }

  try {
    console.log("Begin creating pdf files...");

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const filename = sanitizeFilename(url) + ".pdf";

      await page.goto(url);
      await page.pdf({
        path: outputFolder + "/" + filename,
        format: "A4",
        displayHeaderFooter: true
      });

      const title = await page.title();

      readline.clearLine(process.stdout);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        `Progress: ${(((i + 1) / urls.length) * 100).toFixed(0)}% - ${filename}`
      );
    }

    await browser.close();

    readline.clearLine(process.stdout);
    readline.cursorTo(process.stdout, 0);
    console.log("Complete");
  } catch (e) {
    throw new Error(e);
  }
};

const htmlToPdf = async (url, out) => {
  if (!url) {
    console.log("No url specified, exiting.");
    return;
  }

  try {
    createOutputFolder(out);
    const urls = await getUrlsFromSiteMap(url);
    generatePdfsFromUrls(urls, out);
  } catch (e) {
    console.log(e);
  }
};

program.version(version);
program
  .arguments("<url>")
  .description("", { url: "sitemap url" })
  .option("-o, --out <path>", "output path of pdf documents", "./")
  .action((url, opts) => {
    htmlToPdf(url, opts.out);
  });

program.parse();
