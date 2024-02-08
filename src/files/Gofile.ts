import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import {loggerFactory} from '../logs/LoggerFactory';

export class GoFile {

    private initialized: boolean;
    private serverUrl: string;

    constructor(
        private account,
        private password) {
        this.initialized = false;
        this.serverUrl = 'srv-file6';
    }

    async _initialize() {
        if (this.initialized) {
            return;
        }

        const resp = await axios.get('https://apiv2.gofile.io/getServer');
        if (resp && resp.data && resp.data.data && resp.data.data.server) {
            this.serverUrl = resp.data.data.server;
            this.initialized = true;
        }
    }

    async upload(filePath) {

        if (!this.account) {
            return;
        }

        try {
            await this._initialize();
            const form = new FormData();
            const stream = fs.createReadStream(filePath);
            form.append('file', stream);
            form.append('email', this.account);
            form.append('password', this.password);
            return new Promise((resolve, reject) => {
                form.submit(`https://${this.serverUrl}.gofile.io/uploadFile`, function (err, res) {
                    // res – response object (http.IncomingMessage)  //
                    res.resume();
                    resolve(res);
                });
            });
        } catch (e) {
            loggerFactory.getLogger().warn(`gofile cannot upload ${filePath}`, e);
        }
    }

}

