import NBinary from "./../NBinary.js";

export default class ParamSfo{
    PSF_TYPE_BIN = 0;
    PSF_TYPE_STR = 2;
    PSF_TYPE_VAL = 4;

    getVersion(binary){

        let buffer = new ArrayBuffer(5);
        let view   = new Uint8Array(buffer);
        view[0] = binary.consume(1, 'uint8');
        view[1] = binary.consume(1, 'uint8');
        view[2] = binary.consume(1, 'uint8');
        view[3] = binary.consume(1, 'uint8');
        view[4] = 0x00;
        let version = new NBinary(buffer);


        let first = version.consume(1, 'uint8');
        let minor = version.consume(4, 'uint32');

        return parseFloat(first + '.' + minor);
    }

    /**
     *
     * @param binary {NBinary}
     */
    parse(binary) {
        binary.setCurrent(4);

        let _this = this;
        let version = this.getVersion(binary);

        let header = binary.parseStruct({
            keyTableStart:     'uInt32',
            dataTableStart:    'uInt32',
            tableEntries:      'uInt32'
        });
        header.version = version;

        let entries = [];
        for(let i = 0; i < header.tableEntries; i++) {
            entries.push(binary.parseStruct({
                nameOffset:   'uInt16',
                alignment:    'uInt8',
                type:         'uInt8',
                valueSize:    'uInt32',
                totalSize:    'uInt32',
                dataOffset:   'uInt32',
            }));
        }

        entries.forEach(function (entry) {
            binary.setCurrent(header.keyTableStart + entry.nameOffset);
            entry.name = binary.getString(0x00);
        });

        entries.forEach(function (entry) {
            binary.setCurrent(header.dataTableStart + entry.dataOffset);

            switch(entry.type){
                case _this.PSF_TYPE_STR:
                    entry.data = binary.getString(0x00);
                    break;
                case _this.PSF_TYPE_VAL:
                    entry.data = binary.consume(4, 'uint32');
                    break;
                case _this.PSF_TYPE_BIN:
                    entry.data = binary.consume(entry.valueSize, 'nbinary');
                    break
            }

        });


        return entries.map(function (entry) {
            return {
                name: entry.name,
                value: entry.data
            };
        });
    }


}
