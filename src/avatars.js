const https = require('https');
const fs = require('fs');
const url = require('url');

https.globalAgent.maxSockets = 5;

let avatars = 0;

const files = fs.readdirSync('./storage');
try {
    fs.mkdirSync('./images');
} catch (error) {}

let index = -1;

(async () => {
    for (let i = 0; i < files.length; i++) {
        const fileName = files[i];
        if (fileName.split('-').length === 1) {
            const content = fs.readFileSync('./storage/' + fileName);
            try {
                const file = JSON.parse(content);
                if (file.profile?.avatar?.length && file.profile.avatar[0] !== 'https://infura-ipfs.io/ipfs/QmcK8FSTtLQVydLEDKLv1hEacLxZgi7j2i4mkQQMyKxv6k') {
                    avatars++;
                    let avatar = file.profile.avatar[0];
                    if (avatar.startsWith('ipfs://')) {
                        avatar = avatar.replace('ipfs://', 'https://rss3.mypinata.cloud/ipfs/');
                    }

                    const urlObject = url.parse(avatar);
                    const req = https.get({
                        hostname: urlObject.hostname,
                        path: urlObject.path,
                        protocol: urlObject.protocol,
                        timeout: 5000,
                    }, (response) => {
                        if (response.statusCode !== 200) {
                            console.log('error', index, avatar, response.statusCode);
                            return;
                        }
                        const current = ++index;
                        const page = Math.floor(current / 100);
                        try {
                            fs.mkdirSync('./images/' + page);
                        } catch (error) {}
                        console.log('download', current, avatar, `${i}/${files.length}`);
                        let name = './images/' + page + '/' + fileName;
                        switch (response.headers['content-type']) {
                            case 'image/jpeg':
                                name += '.jpg';
                                break;
                            case 'image/png':
                                name += '.jpg';
                                break;
                            case 'image/webp':
                                name += '.webp';
                                break;
                            case 'image/gif':
                                console.log('unsupported type', current, avatar, response.headers['content-type']);
                                return;
                            default:
                                console.log('unknown type', current, avatar, response.headers['content-type']);
                                return;
                        }
                        response.pipe(fs.createWriteStream(name));
                    });
                    req.on('error', (err) => {
                        console.log('error', err.message);
                    });
                }
            } catch (error) {
                console.error(`Error: fileName: ${fileName} content: ${content} error: ${error}`);
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
})();
