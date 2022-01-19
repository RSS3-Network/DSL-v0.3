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

    const collection = db.collection('files');

    const files = await collection.find({ path: { $exists: true }, $where: 'this.path.length === 42' }).toArray();

    await Promise.all(
        files.map(async (file) => {
            const content = file.content;

            delete content.items;

            content.assets = await getAssets(content.id);

            writeFile(`storage/${content.id}.json`, content);
        }),
    );

    console.log('Export finished at', new Date().toISOString());
}

async function getAssets(rss3id) {
    const collection = db.collection('assets');
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

function writeFile(path, content) {
    fs.writeFileSync(path, JSON.stringify(content));
}

async function calStats() {
    console.log('Overall stats started to compute at', new Date().toISOString());
    const constructQueryForFollowing = (followRegex) => {
        return [
            { $match: { path: { $regex: followRegex }, 'content.list': { $exists: true } } },
            { $group: { _id: null, totalSize: { $sum: { $size: '$content.list' } } } },
        ];
    };

    const constructQueryForAsset = (assetRegex) => {
        return [
            {
                $project: {
                    content0: {
                        $filter: {
                            input: '$content',
                            as: 'item',
                            cond: { $regexMatch: { input: '$$item', regex: assetRegex } },
                        },
                    },
                },
            },
            { $group: { _id: null, totalSize: { $sum: { $size: '$content0' } } } },
        ];
    };

    const userCount = db.collection('files').count({
        path: { $exists: true },
        $expr: { $eq: [{ $strLenCP: '$path' }, 42] },
    });

    // links
    const links_following = db.collection('files').aggregate(constructQueryForFollowing('-links.following')).toArray();

    // backlinks
    const backlinks_following = db
        .collection('files')
        .aggregate(constructQueryForFollowing('-backlinks.following'))
        .toArray();

    // assets
    const totalAssetCount = db
        .collection('assets')
        .aggregate([{ $group: { _id: null, totalSize: { $sum: { $size: '$content' } } } }])
        .toArray();
    const Ethereum_NFT = db.collection('assets').aggregate(constructQueryForAsset('Ethereum.NFT')).toArray();
    const Polygon_NFT = db.collection('assets').aggregate(constructQueryForAsset('Polygon.NFT')).toArray();
    const Gitcoin_Donation = db.collection('assets').aggregate(constructQueryForAsset('Gitcoin.Donation')).toArray();
    const Dai_POAP = db.collection('assets').aggregate(constructQueryForAsset('Dai.POAP')).toArray();
    const BSC_NFT = db.collection('assets').aggregate(constructQueryForAsset('BSC.NFT')).toArray();
    const Mirror_XYZ = db.collection('assets').aggregate(constructQueryForAsset('Mirror.XYZ')).toArray();

    const result = await Promise.all([
        userCount,
        totalAssetCount,
        Ethereum_NFT,
        Polygon_NFT,
        Gitcoin_Donation,
        Dai_POAP,
        BSC_NFT,
        Mirror_XYZ,
        links_following,
        backlinks_following,
    ]);

    const response = {
        count: result[0],
        links: {
            following: result[8].length ? result[8][0].totalSize : null,
        },
        backlinks: {
            following: result[8].length ? result[8][0].totalSize : null,
        },
        assets: {
            totalCount: result[1].length ? result[1][0].totalSize : null,
            'EVM+': {
                'Ethereum-NFT': result[2].length ? result[2][0].totalSize : null,
                'Polygon-NFT': result[3].length ? result[3][0].totalSize : null,
                'Gitcoin-Donation': result[4].length ? result[4][0].totalSize : null,
                'Dai-POAP': result[5].length ? result[5][0].totalSize : null,
                'BSC-NFT': result[6].length ? result[6][0].totalSize : null,
                'Mirror-XYZ': result[7].length ? result[7][0].totalSize : null,
            },
        },
    };

    // const history = JSON.parse(fs.readFileSync('./statics/history.json').toString());

    // history[new Date().toISOString()] = response;

    // writeFile(`./statics/history.json`, history);
    writeFile(`./statics/overall.json`, response);

    console.log('Overall stats computed at', new Date().toISOString());
}

async function main() {
    db = await getConn();
    await exportFiles();
    await calStats();
    await client.close();
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.log(e);
    }
})();
