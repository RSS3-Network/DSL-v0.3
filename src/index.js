const fs = require('fs');
const nodeCron = require('node-cron');
const nodegit = require('nodegit');
const { MongoClient, Db } = require('mongodb');

require('dotenv').config();

let conn, client;

async function commitAndPush() {
    const repo = await nodegit.Repository.open('./');

    const index = await repo.refreshIndex();
    await index.addAll();
    await index.write();

    const oid = await index.writeTree();
    const parent = await repo.getHeadCommit();
    const author = nodegit.Signature.now('RSS3 bot', 'contact@rss3.io');
    const committer = nodegit.Signature.now('RSS3 bot', 'contact@rss3.io');

    await repo.createCommit('HEAD', author, committer, ':zap: auto update rss3 statistics', oid, [parent]);

    const remote = await repo.getRemote('origin');

    remote.push(['refs/heads/dev:refs/heads/dev'], {
        callbacks: {
            credentials: function (url, userName) {
                return nodegit.Cred.sshKeyFromAgent(userName);
            },
        },
    });

    console.log('Repo pushed at', new Date().toISOString());
}

async function getConn() {
    client = await MongoClient.connect(process.env.MONGO_DB);
    return client.db('rss3');
}

async function exportFiles() {
    console.log('Export started at', new Date().toISOString());

    const collection = conn.collection('files');

    const files = await collection.find({ path: { $exists: true }, $where: 'this.path.length === 42' }).toArray();

    await Promise.all(
        files.map(async (file) => {
            file = file.content;

            delete file.items;
            file.assets = await getAssets(file.id);

            writeFiles(file);
        }),
    );

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

async function main() {
    nodeCron.schedule('* 10 * * * *', async () => {
        conn = await getConn();
        await exportFiles();
        await commitAndPush();
        await client.close();
    });
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.log(e);
    }
})();
