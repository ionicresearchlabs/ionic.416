/**
* @file IONIC Predictive Neural Network component.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @copyright MIT License
*/

/**
* Converts a JavaScript 64-bit floating point Number to its internal
* binary representation.
*
* @param {Number} number The number to convert.
*
* @return {Array} Indexed array of binary values (numbers) representing the
* internal value of the input.
*/
function numToBinary (number) {
    var result = new Array();
    var dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, number, false);
    for (var count = 0; count < 8; count++) {
        var bits = dv.getUint8(count).toString(2);
        if (bits.length < 8) {
            bits = new Array(8 - bits.length).fill('0').join("") + bits;
        }
        for (var count2=0; count2 < bits.length; count2++) {
          result.push(parseInt(bits[count2]));
        }
    }
    return result;
}
