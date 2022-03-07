const https = require('https');
const fs = require('fs');

let avatars = 0;

const files = fs.readdirSync('./storage');
try {
    fs.mkdirSync('./tmp');
    fs.mkdirSync('./tmp/images');
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

                    await new Promise((resolve) => {
                        console.log('start', `${i}/${files.length}`);
                        const req = https.get(avatar, (response) => {
                            if (response.statusCode !== 200) {
                                console.log('error', index, avatar, response.statusCode);
                                resolve();
                                return;
                            }
                            let postfix = '';
                            switch (response.headers['content-type']) {
                                case 'image/jpeg':
                                    postfix = '.jpg';
                                    break;
                                case 'image/png':
                                    postfix = '.jpg';
                                    break;
                                case 'image/webp':
                                    postfix = '.webp';
                                    break;
                                case 'image/bmp':
                                    postfix = '.bmp';
                                    break;
                                case 'image/svg+xml':
                                    postfix = '.svg';
                                    break;
                                case 'image/x-icon':
                                    postfix = '.icon';
                                    break;
                                case 'image/gif':
                                    postfix = '.gif';
                                    break;
                                default:
                                    console.log('unknown type', index, avatar, response.headers['content-type']);
                                    resolve();
                                    return;
                            }
                            const current = ++index;
                            const page = Math.floor(current / 100);
                            try {
                                fs.mkdirSync('./tmp/images/' + page);
                            } catch (error) {}
                            console.log('download', current, avatar, `${i}/${files.length}`);
                            let name = './tmp/images/' + page + '/' + fileName + postfix;
                            response.pipe(fs.createWriteStream(name));
                            resolve();
                        });
                        req.on('error', (err) => {
                            console.log('error', err.message);
                            resolve();
                        });
                        setTimeout(() => {
                            req.destroy();
                            resolve();
                        }, 5000);
                    });
                }
            } catch (error) {
                console.error(`Error: fileName: ${fileName} content: ${content} error: ${error}`);
            }
        }
    }
})();
