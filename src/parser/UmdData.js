/**
 * Developed by Sor3nt <sor3nt@gmail.com> for UMDatabase.net
 */
import NBinary from "./../NBinary.js";

export default class UmdData{

    /**
     *
     * @param binary {NBinary}
     */
    parse(binary) {

        return binary.parseStruct({
            id:     ['string', 10],
            spacer:    ['seek', 1],
            key:      ['string', 16],
            spacer2:    ['seek', 1],
            unknown:      ['string', 4],
            spacer3:    ['seek', 1],
            category:     ['string', 14],
        });

    }


}
