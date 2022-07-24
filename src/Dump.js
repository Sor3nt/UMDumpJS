import FileDrop from "./FileDrop.js";
import Iso9660 from "./parser/Iso9660.js";
import SfoParser from "./parser/ParamSfo.js";

export default class Dump {

    callback = function () {};
    config = {};

    /**
     *
     * @param config {{dropZone: string}}
     * @param callback
     */
    constructor(config, callback) {
        this.config = config;
        this.callback = callback;
        let _this = this;
        new FileDrop(config.dropZone, function (file) {
            _this.onFileDrop(file)
        });
    }

    /**
     *
     * @param {{name: string, binary: NBinary, fileNamePath: string}} file
     */
    onFileDrop(file) {
        let sfoParser = new SfoParser();

        file.binary.setCurrent(0);

        try {
            let iso9660Parser = new Iso9660();
            let isoInfo = iso9660Parser.parse(file);

            isoInfo.sfo = [];
            iso9660Parser.files.forEach(function (file) {
                if (file.name.toUpperCase() === "PARAM.SFO"){
                    let content = iso9660Parser.getFileContent(file);
                    isoInfo.sfo.push(sfoParser.parse(content));
                } else if (file.name.toUpperCase() === "ICON0.PNG"){
                    isoInfo.icon = iso9660Parser.getFileContent(file);
                }
            });

            this.callback(isoInfo);

        } catch (error) {
            console.error("Error parsing file", file.fileNamePath, "Exception", error);
        }
    }

}
