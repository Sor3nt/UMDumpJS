
export default class Iso9660{

    BLOCK_SIZE = 2048;
    BOOT_RECORD_OFFSET = 2048 * 16;

    /**
     * @type {{name: string, binary: NBinary, fileNamePath: string}}
     */
    file;

    header = {};

    files = [];
    folders = [];

    /**
     *
     * @param {{name: string, binary: NBinary, fileNamePath: string}} file
     */
    parse(file){

        this.file = file;
        this.header = this.parseHeader();

        let tablePos = this.header.lPathTbl1 * this.BLOCK_SIZE;
        this.file.binary.setCurrent(tablePos);

        return {
            header: {
                isoId: this.header.isoId,
                version: this.header.version,
                identifier: this.header.identifier,
                gameName: this.header.gameName,

                applicationArea: {
                    text: this.header.applicationArea.getString(),
                    hex: this.buf2hex(this.header.applicationArea.data)
                }
            },

            pvd: {
                volumeSetId: this.header.volumeSetId,
                publisherId: this.header.publisherId,
                dataPrepId: this.header.dataPrepId,
                applicationId: this.header.applicationId,

                creationTime: this.header.creationTime,
                modifyTime: this.header.modifyTime,
                expireTime: this.header.expireTime,
                effectiveTime: this.header.effectiveTime
            },

            lsb: this.parseTable(),
            msb: this.parseTable(),

            filesystem: this.getCleanFileSystemTree(
                this.parseFileSystem(this.header.rootDirectory.offset, this.header.rootDirectory.dataLength)
            )
        };

    }

    buf2hex(buffer) {
        return [...new Uint8Array(buffer)]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('');
    }

    parseTable(){

        let tableBinary = this.file.binary.consume(2048, 'nbinary');
        tableBinary.seek(10); //header ?

        let entries = [];
        while(tableBinary.remain() > 12){

            let entry = tableBinary.parseStruct({
                lenDirName:            'uInt8',
                lenExtAttrRec:         'uInt8',
                lbaExtent:             'uInt32',
                parentDirIdx:          'uInt16'
            });

            if (entry.lenDirName === 0) continue;

            entry.dirName = tableBinary.consume(entry.lenDirName, 'string');

            if (entry.lenDirName % 2 === 1)
                tableBinary.seek(1);

            entries.push(entry);
        }

        return entries;
    }

    parseCDDateTime(){
        return this.file.binary.parseStruct({
            year:             ['string', 4],
            month:            ['string', 2],
            day:              ['string', 2],
            hour:             ['string', 2],
            minute:           ['string', 2],
            second:           ['string', 2],
            hSecond:          ['string', 2],
            offset:           'int8'
        });
    }

    parseHeader(){
        this.file.binary.setCurrent(this.BOOT_RECORD_OFFSET);

        let header = this.file.binary.parseStruct({
            bootIndicator:    'uInt8',
            isoId:            ['string', 5],
            version:          'uInt8',
            identifier:       ['string', 32, "\x20\x20"],
            gameName:         ['string', 32, "\x20\x20"],
            bootCatalog:      'uInt32',
            unused2:          ['seek', 5],
            volSpaceSizeLe:   'uInt32',
            volSpaceSizeBe:   'uInt32',
            escSeq:           ['seek', 32],
            volSetSize:       'uInt32',
            volSeqNum:        'uInt32',
            lBlockSize:       'uInt32',
            pathTblSizeLe:    'uInt32',
            pathTblSizeBe:    'uInt32',
            lPathTbl1:        'uInt32',
            lPathTbl2:        'uInt32',
            mPathTbl1:        'uInt32',
            mPathTbl2:        'uInt32'
        });

        header.rootDirectory = this.parseDirectory(this.file.binary);

        header = {...header, ...this.file.binary.parseStruct({
            volumeSetId:       ['string', 128, "\x20\x20"],
            publisherId:       ['string', 128, "\x20\x20"],
            dataPrepId:        ['string', 128, "\x20\x20"],
            applicationId:     ['string', 128, "\x20\x20"],
            copyrightFileId:   ['string', 37,  "\x20\x20"],
            abstractFileId:    ['string', 37,  "\x20\x20"],
            biblioFileId:      ['string', 37,  "\x20\x20"]
        })};

        header.creationTime = this.parseCDDateTime();
        header.modifyTime = this.parseCDDateTime();
        header.expireTime = this.parseCDDateTime();
        header.effectiveTime = this.parseCDDateTime();

        header = {...header, ...this.file.binary.parseStruct({
            fileStrucVer:     'uInt8',
            unused:           ['seek', 1],
            applicationArea:  ['nbinary', 512]
        })};

        header.identifier = header.identifier.substr(1);
        header.gameName = header.gameName.substr(1);

        ['identifier', 'gameName', 'volumeSetId', 'publisherId', 'dataPrepId',
         'applicationId', 'copyrightFileId', 'abstractFileId', 'biblioFileId'].forEach(function (index) {
            header[index] = header[index].trim();
        });

        return header;
    }

    /**
     *
     * @param directory {{offset: int, dataLength: int }}
     * @returns {NBinary}
     */
    getFileContent(directory){
        this.file.binary.setCurrent(directory.offset * this.BLOCK_SIZE);
        return this.file.binary.consume(directory.dataLength, 'nbinary');
    }

    getCleanFileSystemTree(entries){
        let tree = [];
        let _this = this;
        entries.forEach(function (entry) {
            tree.push(_this.getCleanFileSystemTreeEntry(entry));
        });

        return tree;
    }

    getCleanFileSystemTreeEntry(entry, root){
        root = root || './';
        root += entry.name + (entry.isFolder ? "/" : "");

        entry.path = root;
        let result = {
            name: entry.name,
            path: entry.path,
            offset: entry.offset,
            isFolder: entry.isFolder,
            creationTime: entry.recTime,
            children:[]
        };

        if (result.isFolder === false)
            result.size = entry.dataLength;

            let _this = this;
        entry.children.forEach(function (child) {
            let entry = _this.getCleanFileSystemTreeEntry(child, root);
            result.children.push(entry);
        });

        return result

    }


    parseFileSystem(lbaAddress, length){
        this.file.binary.setCurrent(lbaAddress * this.BLOCK_SIZE);
        let binary = this.file.binary.consume(length, 'nbinary');

        let results = [];
        while(true){
            let dirLen = binary.consume(1, 'uint8');
            binary.seek(-1);
            if (dirLen === 0) break;

            let directoryBinary = binary.consume(dirLen, 'nbinary');

            let directory = this.parseDirectory(directoryBinary);
            if (directory.nameLength === 1) continue;

            directory.children = [];
            directory.isFolder = (directory.fileFlags & 0b00000010) === 2;

            //Is directory ?
            if(directory.isFolder){
                let subContent = this.parseFileSystem(directory.offset, directory.dataLength);
                subContent.forEach(function (dir) {
                    directory.children.push(dir);
                });

                this.folders.push(directory);
            }else{
                this.files.push(directory);
            }

            results.push(directory);
        }

        return results;
    }

    parseDirectory(binary){
        let header = binary.parseStruct({
            recordLength:     'uInt8',
            extAttrRecLength: 'uInt8',
            offset:           'uInt32',
            offsetBe:         ['seek', 4],
            dataLength:       'uInt32',
            dataLengthBe:     ['seek', 4]
        });

        header.recTime = binary.parseStruct({
            year:             'uInt8',
            month:            'uInt8',
            day:              'uInt8',
            hour:             'uInt8',
            minute:           'uInt8',
            second:           'uInt8',
            timezone:         'uInt8'
        });
        header.recTime.year += 1900;

        header = {...header, ...binary.parseStruct({
            fileFlags:        'uInt8',
            fileUnitSize:     'uInt8',
            interleaveGapSize:'uInt8',
            volSeqNum:        'uInt32',
            nameLength:       'uInt8',
        })};

        header.name = binary.consume(header.nameLength, 'string');

        return header;
    }
}
