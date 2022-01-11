const fs = require('fs');
const nodeCron = require('node-cron');
const Git = require('nodegit');
const { MongoClient, Db } = require('mongodb');

require('dotenv').config();

let conn;

// nodeCron.schedule('10 * * * * *', async () => {
// });

async function commit() {
    Git.Repository.open('./').then();
}

async function getConn() {
    const client = await MongoClient.connect(process.env.MONGO_DB);
    return client.db('rss3');
}

async function exportFiles() {

    console.log('Export started at', new Date().toISOString());

    const collection = conn.collection('files');

    const files = await collection.find({ path: { $exists: true }, $where: 'this.path.length === 42' }).toArray();

    files.forEach(async (file) => {
        file = file.content;

        delete file.items;
        file.assets = await getAssets(file.id);

        writeFiles(file);
    });

    console.log('Export finished at', new Date().toISOString());
}

async function getAssets(rss3id) {
    const collection = conn.collection('assets');
    const assets = await collection.findOne({ path: `EVM+-${rss3id}` });

    if (assets && assets.content) {
        return assets.content.map((item) => {
            item = item.split('-');
            return {
                platform: item[0],
                identity: item[1],
                type: item[2].replace('.', '-'),
                id: item[3].replace('.', '-'),
            };
        });
    }

    return [];
}

function writeFiles(content) {
    const path = 'storage';
    fs.writeFileSync(`${path}/${content.id}.json`, JSON.stringify(content));
}

(async () => {
    try {
        conn = await getConn();
        await exportFiles();
    } catch (e) {
        console.log(e);
    }
})();
