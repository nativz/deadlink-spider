const got = require("got");
const cheerio = require("cheerio");

class Spider {
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

    log(content = "") {
        if (!this.verbose) return;

        console.log(content);
    }

    start() {
        this.log("Starting...");

        this.working = true;

        this.log("Crawling root page...");
        this.crawl("http://" + this.domain);
    }

    stop() {
        this.log("Stopped.");
        this.working = false;
    }

    async crawl(url) {
        if (!this.working) return;

        let result = await this.crawlToSave(url);

        if (result.result === "OK") {
            result.next.forEach(url => {
                this.crawl(url);
            });
        }
    }

    urlMatchesDomain(url) {
        let isValidUrl = true;
        try {
            if (new URL(url).hostname != this.domain) isValidUrl = false;
        } catch (err) {
            // means the URL isn't valid
        }

        return isValidUrl;
    }

    async crawlToSave(url) {
        let result = await this.crawlTo(url);

        this.report[result.result.toLowerCase()].push(result.url);

        this.crawlPath.push(result);
        return result;
    }

    /**
     * Crawls to a route.
     * @param {string} route /route
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