/**
 * Developed by Sor3nt <sor3nt@gmail.com> for UMDatabase.net
 */
import FileDrop from "./FileDrop.js";
import Iso9660 from "./parser/Iso9660.js";
import ParamSfo from "./parser/ParamSfo.js";
import UmdData from "./parser/UmdData.js";

export default class Dump {

    callback = function () {};
    onProgressCallback = function () {};
    config = {};

    /**
     *
     * @param config {{dropZone: string}}
     * @param callback
     * @param onProgressCallback
     */
    constructor(config, callback, onProgressCallback) {
        this.config = config;
        this.callback = callback;
        this.onProgressCallback = onProgressCallback;
        let _this = this;
        new FileDrop(config.dropZone, function (file) {
            _this.onFileDrop(file)
        });
    }

    /**
     *
     * @param {{name: string, binary: NBinary, fileNamePath: string}} file
     */
    async onFileDrop(file) {
        let sfoParser = new ParamSfo();
        let umdDataParser = new UmdData();

        file.binary.setCurrent(0);

        try {
            let iso9660Parser = new Iso9660(this.config, this.onProgressCallback);
            let isoInfo = await iso9660Parser.parse(file);

            isoInfo.sfo = [];
            iso9660Parser.files.forEach(function (file) {
                if (file.name.toUpperCase() === "PARAM.SFO"){
                    let content = iso9660Parser.getFileContent(file);
                    isoInfo.sfo.push(sfoParser.parse(content));

                } else if (file.name.toUpperCase() === "ICON0.PNG"){
                    isoInfo.icon = iso9660Parser.getFileContent(file);
                } else if (file.name.toUpperCase() === "UMD_DATA.BIN"){
                    let content = iso9660Parser.getFileContent(file);
                    isoInfo.umdData = umdDataParser.parse(content);
                }

            });

            this.callback(isoInfo);

        } catch (error) {
            console.error("Error parsing file", file.fileNamePath, "Exception", error);
        }
    }

}
