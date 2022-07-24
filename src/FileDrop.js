import NBinary from "./NBinary.js";

export default class FileDrop{


    openRequests = 0;



    constructor(id, callback){
        let _this = this;
        this.callback = callback;
        let dropZone = document.getElementById(id);

        dropZone.addEventListener('dragover', function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        dropZone.addEventListener('drop', function (e) {
            _this.onDrop(e);
        });
    }

    async getFile(fileEntry) {
        try {
            return await new Promise((resolve, reject) => fileEntry.file(resolve, reject));
        } catch (err) {
            console.error(err);
        }
    }


    async scanFiles(item) {

        let _this = this;

        if (item.isDirectory) {
            let directoryReader = item.createReader();

            directoryReader.readEntries(function(entries) {
                entries.forEach(function(entry) {
                    _this.scanFiles(entry );
                });
            });
        }else{

            let extension = item.name.split(".");
            if (extension.length === 1)
                return; //no extension

            extension = extension[extension.length - 1].toLowerCase();

            //only process ISO files
            if (extension !== "iso" ) return;

            this.openRequests++;
            this.processFile(await this.getFile(item), item.fullPath)

        }
    }

    onDrop(e){
        e.preventDefault();

        let items = e.dataTransfer.items;
        for (let i=0; i<items.length; i++) {
            let item = items[i].webkitGetAsEntry();

            if (item) this.scanFiles(item);
        }
    }

    /**
     *
     * @param file {Blob}
     * @param fileNamePath
     */
    processFile(file, fileNamePath){

        let _this = this;
        let reader = new FileReader();

        /**
         * @param event {Event}
         */
        reader.onload = function(event) {

            _this.callback({
                name: file.name,
                fileNamePath: fileNamePath,
                binary: new NBinary(event.target.result)
            });


            _this.openRequests--;

        };

        reader.readAsArrayBuffer(file);
    }




}
