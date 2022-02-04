const fs = require('fs');
const { MongoClient } = require('mongodb');

require('dotenv').config();

let db, client;

async function getConn() {
    client = await MongoClient.connect(process.env.MONGO_DB);
    return client.db('rss3');
}

async function exportFiles() {
    console.log('Export started at', new Date().toISOString());

    const files = await db.collection('files').find().toArray();
    console.log('Files length ', files.length);
    const assets = await db.collection('assets').find().toArray();
    console.log('Assets length ', assets.length);

    let overall = {
        count: 0,
        links: {},
        assets: {
            totalCount: 0,
        },
        accounts: {
            'EVM+': 0,
        },
    }

    await Promise.all(files.map(async (file, index) => {
        if (index % 1000 === 0) {
            console.log(`Export ${index} files`);
        }
        if (file.path.split('-').length === 1) {
            let accounts = [`EVM+-${file.path}`];
            if (file.content.profile?.accounts?.length) {
                accounts = accounts.concat(file.content.profile?.accounts?.map?.((account) => account.id));
            }
            const assetsList = assets.filter((list) => accounts.includes(list.path)).reduce((acc, cur) => acc.concat(cur.content), []);
            const now = new Date().toISOString();

            await fs.promises.writeFile(`storage/${file.path}-list-assets.auto-0`, JSON.stringify({
                id: `${file.path}-list-assets.auto-0`,
                version: file.content.version,
                date_created: now,
                date_updated: now,
                auto: true,
                list: assetsList,
            }));

            // count
            overall.count += 1;

            // accounts
            overall.accounts[`EVM+`]++;
            file.content.profile?.accounts?.forEach((account) => {
                const platform = account.id.split('-')[0];
                if (!overall.accounts[platform]) {
                    overall.accounts[platform] = 0;
                }
                overall.accounts[platform]++;
            });
        } else if (file.path.split('-')[2]?.startsWith('assets')) {
            file.content.list?.forEach((asset) => {
                const platform = asset.split('-')[0];
                const type = asset.split('-')[2];
                if (!overall.assets[platform]) {
                    overall.assets[platform] = {};
                }
                if (!overall.assets[platform][type]) {
                    overall.assets[platform][type] = 0;
                }
                overall.assets[platform][type]++;
                overall.assets.totalCount++;
            });
        } else if (file.path.split('-')[2]?.startsWith('links')) {
            const type = file.path.split('-')[2].split('.')[1];
            if (!overall.links[type]) {
                overall.links[type] = 0;
            }
            overall.links[type] += file.content.list?.length || 0;
        }
        await fs.promises.writeFile(`storage/${file.path}`, JSON.stringify(file.content));
    }));
    
    fs.writeFileSync('./statics/overall.json', JSON.stringify(overall));

    console.log('Export finished at', new Date().toISOString());
}

async function main() {
    db = await getConn();
    await exportFiles();
    await client.close();
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.log(e);
    }
})();
