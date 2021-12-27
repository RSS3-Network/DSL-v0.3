const DATA_ENDPOINT_OPTIONS = {
    hostname: 'prenode.rss3.dev',
    port: 443,
    path: '/stats/count',
    method: 'GET'
};

const OVERALL_DATA_FILE = './statics/overall.json';
const HISTORY_DATA_FILE = './statics/history.json';

const https = require('https');
const fs = require('fs');

(() => {

    const req = https.request(DATA_ENDPOINT_OPTIONS, res => {
        res.on('data', d => {
            // process.stdout.write(d)
            const rawData = d.toString();
            const json = JSON.parse(rawData);
            if (json.code === 0) {
                const data = json.response;
                fs.writeFileSync(OVERALL_DATA_FILE, JSON.stringify(data));
                const historyData = JSON.parse(
                    fs.existsSync(HISTORY_DATA_FILE) ?
                        fs.readFileSync(HISTORY_DATA_FILE).toString() : '{}',
                );
                const time = new Date().toISOString();
                historyData[time] = data;
                fs.writeFileSync(HISTORY_DATA_FILE, JSON.stringify(historyData));
            }
        });
    });

    req.on('error', error => {
        console.error(error);
    });

    req.end();
})();
