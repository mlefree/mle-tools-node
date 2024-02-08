export class Tools {
    static securedSetProperty(src, dest, key) {
        if (src && dest && src.hasOwnProperty(key)) {
            dest[key] = src[key];
        }
    }

    static extractOrderedNames(src: string, possibleNames: string[]): string[] {

        let allNames = '' + src;
        const orderedNames = [];

        let indexOnSrc = 0;
        while (indexOnSrc < allNames.length) {

            const orderedIndexedNames = possibleNames
                .map(name => {
                    const index = allNames.indexOf(name);
                    return {index, name};
                })
                .filter(p => p.index >= 0)
                .sort((a, b) => a.index - b.index);

            if (orderedIndexedNames.length) {
                allNames = allNames.substring(0, orderedIndexedNames[0].index)
                    + '-'.repeat(orderedIndexedNames[0].name.length)
                    + allNames.substring(orderedIndexedNames[0].index + orderedIndexedNames[0].name.length);
                indexOnSrc += orderedIndexedNames[0].name.length;
                orderedNames.push(orderedIndexedNames[0].name);
            } else {
                break;
            }

        }

        return orderedNames;
    }
}
