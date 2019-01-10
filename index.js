const Spider = require("./src/spider");
const fs = require("fs");

const linkChecker = new Spider("http://revealmodern.dev.designvr.net", true);

linkChecker.start();

process.on("SIGINT", () => {
    linkChecker.stop();
    fs.writeFileSync(`./output/crawl-path_${Date.now()}.json`, JSON.stringify(linkChecker.crawlPath));
    fs.writeFileSync(`./output/report_${Date.now()}.txt`, `OK: ${linkChecker.report.ok.length}\n${linkChecker.report.ok.join("\n")}\n\nWARN: ${linkChecker.report.warn.length}\n${linkChecker.report.warn.join("\n")}\n\nERROR: ${linkChecker.report.error.length}\n${linkChecker.report.error.join("\n")}`);
    process.exit();
});