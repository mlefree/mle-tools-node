export class Tools {
    static securedSetProperty(src: object, dest: object, key: string) {
        if (src && dest && key in src) {
            dest[key] = src[key];
        }
    }

    static extractOrderedNames(src: string, possibleNames: string[], sep = '-'): string[] {
        const allNamesToExtract = ('' + src).split(sep);
        return allNamesToExtract.filter((name) => possibleNames.indexOf(name) > -1);
    }

    static zeroPad(num: number, places: number): string {
        return String(num).padStart(places, '0');
    }
}
