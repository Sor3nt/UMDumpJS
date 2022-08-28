/**
 * Developed by Sor3nt <sor3nt@gmail.com> for dixmor-hospital.com
 */
export default class NBinary{

    /**
     * @type {ArrayBuffer|null}
     */
    data = null;

    /**
     *
     * @param data {ArrayBuffer}
     */
    constructor(data){
        this._current = 0;

        this.data = data;
        if (this.remain() <= 4) return;

        this._current = 0;
    }

    remain(){
        return this.data.byteLength - this._current;
    }

    toString(){
        let enc = new TextDecoder();
        return enc.decode(this.data);
    }

    uInt32(little){
        return this.consume(4, 'uint32',little);
    }

    uInt16(little){
        return this.consume(2, 'uint16',little);
    }

    uInt8(little){
        return this.consume(1, 'uint8',little);
    }

    int32(little){
        return this.consume(4, 'int32',little);
    }

    int16(little){
        return this.consume(2, 'int16',little);
    }

    int8(little){
        return this.consume(1, 'int8',little);
    }

    float32(little){
        return this.consume(4, 'float32',little);
    }


    buf2hex(buffer) {
        return [...new Uint8Array(buffer)]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('');
    }


    parseStruct(obj){

        let result = {};
        for(let attr in obj){
            if (!obj.hasOwnProperty(attr)) continue;

            if (typeof obj[attr] === "object"){
                if (obj[attr][0] === "string") {
                    if (typeof obj[attr][2] === "undefined")
                        result[attr] = this.consume(obj[attr][1], 'nbinary').getString(0);
                    else
                        result[attr] = this.consume(obj[attr][1], 'nbinary').getString(obj[attr][2]);
                }else if (obj[attr][0] === "nbinary"){
                    result[attr] = this.consume(obj[attr][1], 'nbinary');
                }else if (obj[attr][0] === "hex"){
                    result[attr] = this.buf2hex( this.consume(obj[attr][1], 'nbinary').data );
                }else if (obj[attr][0] === "seek"){
                    this.seek(obj[attr][1]);
                   // result[attr] = undefined;
                }else{
                    if (typeof obj[attr][1] === "function") {
                        let val = this[obj[attr][0]]();
                        result[attr] = obj[attr][1](val);
                    }else if (typeof obj[attr][1] === "boolean"){
                        result[attr] = this[obj[attr][0]](obj[attr][1]);

                    }else{
                        debugger;

                    }
                }
            }else{
                result[attr] = this[obj[attr]]();
            }
        }

        return result;

    }

    consume(bytes, type, little) {
        little = little === undefined  ? true : little;
        let view = new DataView(this.data, this._current);

        this._current += bytes;

        if (type === 'uint64') return view.getBigUint64(0, little);
        // if (type === 'uint64') return this.getUint64(view, little);
        if (type === 'int16') return view.getInt16(0, little);
        if (type === 'int32') return view.getInt32(0, little);
        if (type === 'uint32') return view.getUint32(0, little);
        if (type === 'float32') return view.getFloat32(0, little);
        if (type === 'uint16') return view.getUint16(0, little);
        if (type === 'int8') return view.getInt8(0);
        if (type === 'uint8') return view.getUint8(0);
        if (type === 'arraybuffer'){

            let buffer = new ArrayBuffer(bytes);
            let storeView = new DataView(buffer);

            let index = 0;
            while(bytes--){
                storeView.setUint8(index, view.getUint8(index));
                index++;
            }
            return buffer;
        }

        if (type === 'dataview'){
            return new DataView(this.data,this._current - bytes, bytes);
        }

        if (type === 'nbinary'){

            let buffer = new ArrayBuffer(bytes);
            let storeView = new DataView(buffer);

            let index = 0;
            while(bytes--){
                storeView.setUint8(index, view.getUint8(index));
                index++;
            }

            return new NBinary(buffer);
        }


        if (type === 'string'){
            let str = "";
            let index = 0;
            while(bytes--){
                str += String.fromCharCode(view.getUint8(index));
                index++
            }

            return str;
        }
        console.error(type, "not known, error");
        debugger;

        return view;
    }

    getString(delimiter, doPadding) {

        let name = '';
        let nameIndex = 0;
        while(this.remain() > 0){
            let val = this.consume(1, 'uint8');
            if (val === delimiter) break;
            name += String.fromCharCode(val);
            nameIndex++;
        }

        if (doPadding === true){
            nameIndex++;

            if (4 - (nameIndex % 4) !== 4){
                this._current += 4 - (nameIndex % 4);
            }

        }

        return name;
    }

    seek(bytes) {
        this._current = this._current + bytes;
    }

    setCurrent(cur){
        this._current = cur;
    }

    current (){
        return this._current;
    }


}
