const got = require("got");

class Spider {
    /**
     * Creates a Spider.
     * @param {string} domain The root domain of the website.
     * @param {boolean} verbose Whether or not to log steps to the console.
     */
    constructor(domain, verbose = false) {
        this.domain = new URL(domain).hostname;
        this.verbose = verbose;
        this.crawlPath = [];
        this.urls = [];
        this.working = false;
        this.report = {
            ok: [],
            warn: [],
            error: [],
        }
    }

    /**
     * If verbose mode is enabled, logs to console.
     * @param {any} content The content to log.
     */
    log(content) {
        if (!this.verbose) return;

        console.log(content);
    }

    /**
     * Starts the Spider.
     */
    start() {
        this.log("Starting...");

        this.working = true;

        this.log("Crawling root page...");
        this.crawl("http://" + this.domain);
    }

    /**
     * Stops the spider.
     */
    stop() {
        this.log("Stopped.");
        this.working = false;
    }

    /**
     * Loop function for crawling the website.
     * @param {string} url The URL to crawl.
     */
    async crawl(url) {
        if (!this.working) return;

        let result = await this.crawlToSave(url);

        if (result.result === "OK") {
            result.next.forEach(url => {
                this.crawl(url);
            });
        }
    }

    /**
     * Checks if a URL is part of the root domain.
     * @param {string} url The URL to test.
     */
    urlMatchesDomain(url) {
        let isValidUrl = true;
        try {
            if (new URL(url).hostname != this.domain) isValidUrl = false;
        } catch (err) {
            // means the URL isn't valid
        }

        return isValidUrl;
    }

    /**
     * Crawls to a URL and saves the output to the Spider's crawlPath.
     * @param {string} url The URL to crawl to.
     * @returns {Promise<{url: string, result: "OK"|"WARN"|"ERROR", status: number, next?: Array<string>}>}
     */
    async crawlToSave(url) {
        let result = await this.crawlTo(url);

        this.report[result.result.toLowerCase()].push(result.url);

        this.crawlPath.push(result);
        return result;
    }

    /**
     * Crawls to a url.
     * @param {string} url The URL to crawl to.
     * @returns {Promise<{url: string, result: "OK"|"WARN"|"ERROR", status: number, next?: Array<string>}>}
     */
    async crawlTo(url) {
        this.urls.push(url);

        this.log(`Working on ${url}`);

        return new Promise((resolve, reject) => {
            got(url).then(resp => {
                if (resp.statusCode < 200 || resp.statusCode > 299) {
                    this.log(`${url} responded with ${resp.statusCode}.`);

                    resolve({
                        url: url,
                        result: "WARN",
                        status: resp.statusCode
                    });
                } else {
                    if (!resp.headers["content-type"].includes("text")) {
                        this.log(`${url} responded with 2XX but isn't readable.`);

                        resolve({
                            url: url,
                            result: "OK",
                            status: resp.statusCode,
                            next: []
                        });
                    } else {
                        this.log(`${url} responded with 2XX. Scanning for URLs...`);

                        let next = [...new Set(resp.body.match(/(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/g))].filter(url => !this.urls.includes(url) && new URL(url).hostname == this.domain);

                        this.log(`Found URLs:\n${next}`);

                        resolve({
                            url: url,
                            result: "OK",
                            status: resp.statusCode,
                            next: next
                        });
                    }
                }
            }).catch(err => {
                this.log(`Error when attempting to work on ${url}`);
                this.log(err);

                resolve({
                    url: url,
                    result: "ERROR",
                    status: 0
                });
            });
        });
    }
}

module.exports = Spider;