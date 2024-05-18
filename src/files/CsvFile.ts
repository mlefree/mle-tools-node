import fs from 'fs';
import {format, parse, writeToStream} from 'fast-csv';

export class CsvFile {

    private readonly headers: any;
    private readonly path: any;
    private readonly writeOpts: any;

    constructor(opts) {
        this.headers = opts.headers;
        this.path = opts.path;
        this.writeOpts = {includeEndRowDelimiter: true};
        if (this.headers) {
            this.writeOpts.headers = this.headers;
        }
    }

    static write(filestream, rows, options) {
        return new Promise((res, rej) => {
            writeToStream(filestream, rows, options)
                .on('error', err => rej(err))
                .on('finish', () => res(null));
        });
    }

    static escapeRegExp = (string) => {
        return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    static replaceAll = (str, find, replace) => {
        return str.replace(new RegExp(CsvFile.escapeRegExp(find), 'g'), replace);
    }

    create(rows) {
        return CsvFile.write(fs.createWriteStream(this.path), rows, {...this.writeOpts});
    }

    append(rows) {
        return CsvFile.write(fs.createWriteStream(this.path, {flags: 'a'}), rows, {
            ...this.writeOpts,
            // don't write the headers when appending
            writeHeaders: false,
        });
    }

    read() {
        return new Promise((res, rej) => {
            fs.readFile(this.path, (err, contents) => {
                if (err) {
                    return rej(err);
                }
                let contentsPurified = CsvFile.replaceAll(contents.toString(), '\r', '');
                return res(contentsPurified);
            });
        });
    }

    readRows(transformFn) {
        return fs.createReadStream(this.path)
            .pipe(parse({headers: true}))
            // pipe the parsed input into a csv formatter
            .pipe(format({headers: true}))
            // Using the transform function from the formatting stream
            .transform(transformFn)
            //.pipe(process.stdout)
            //.on('end', () => process.exit())
            ;
    }

    pipe(res) {
        const stream = fs.createReadStream(this.path);
        return stream.pipe(res);
        // res.attachment(filename);
        // stream.pipe(res);

        //return createReadStream(this.path)
        //  .pipe(parse())
        // .on('error', (error) => console.error(error))
        // .on('data', (row) => console.log(row))
        // .on('end', (rowCount) => console.log(`Parsed ${rowCount} rows`));
    }

}
