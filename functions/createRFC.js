
function createRFC(nombre, Apaterno, Amaterno, fechaNacimiento) {
    //Reemplazar vocales con acentos por vocales sin atentos en el nombre y apellido
    let RFCP = "";
    let nombrenuevo;
    let apaterno;
    let amaterno;
    nombrenuevo = nombre.replace("Á","A");
    apaterno = Apaterno.replace("Á", "A");
    amaterno = Amaterno.replace("Á", "A");
    nombrenuevo = nombrenuevo.replace("É","E");
    apaterno = apaterno.replace("É", "E");
    amaterno = amaterno.replace("É", "E");
    nombrenuevo = nombrenuevo.replace("Í","I");
    apaterno = apaterno.replace("Í", "I");
    amaterno = amaterno.replace("Í", "I");
    nombrenuevo = nombrenuevo.replace("Ó","O");
    apaterno = apaterno.replace("Ó", "O");
    amaterno = amaterno.replace("Ó", "O");
    nombrenuevo = nombrenuevo.replace("Ú","U");
    apaterno = apaterno.replace("Ú", "U");
    amaterno = amaterno.replace("Ú", "U");
    //Eliminar palabras que no se necesitan en el nombre y apellido por "" (Campo vacio)
    let PalabrasEliminar = [".", ",", "DE ", "DEL ", "LA ", "LOS ", "LAS ", "Y ", "MC ", "MAC ", "VON ", "VAN "]
    for (let index = 0; index < PalabrasEliminar.length; index++) {
        nombrenuevo = nombrenuevo.replace(PalabrasEliminar[index], "");
        apaterno = apaterno.replace(PalabrasEliminar[index], "");
        amaterno = amaterno.replace(PalabrasEliminar[index], "");
    }
     //Palabras para elimar dentro del nombre, se deja ""
    let NombresEliminar = ["JOSE ", "MARIA ", "J ", "MA "]
    if (nombrenuevo.includes(" ")) {
        console.log("SImon");
        for (let index = 0; index < NombresEliminar.length; index++) {
            nombrenuevo = nombrenuevo.replace(NombresEliminar[index], "");
        }
    }
    let primeraVocal = (obtenerPrimeraVocal(apaterno));
    if(!primeraVocal){
        primeraVocal = apaterno.slice(1,2);
    }
    const nombresBaneados = ['BUEI', 'BUEY', 'CACA', 'CACO', 'CAGA', 'CAGO', 'CAKA', 'CAKO', 'COGE', 'COJA', 'KOGE', 'KOJO', 'KAKA', 'KULO', 'MAME', 'MEAR', 'MEAS', 'MEON', 'MION', 'COJE', 'COJI', 'COJO', 'CULO', 'FETO', 'GUEY', 'JOTO', 'KAKA', 'KACO', 'KAGA', 'KAGO', 'MOCO', 'MULA', 'PEDA', 'PEDO', 'PENE', 'PUTA', 'PUTO', 'QULO', 'RATA', 'RUIN'];
    if (apaterno.length < 3 && amaterno.length >= 1 && nombrenuevo.length >= 1) {
        let rfc = apaterno.slice(0, 1) + amaterno.slice(0, 1) + nombrenuevo.slice(0,2) + fechaNacimiento.slice(2,4) + fechaNacimiento.slice(5,7) + fechaNacimiento.slice(8,10)
        if(nombresBaneados.includes(rfc.slice(0,4).toUpperCase())){
            let nuevoRFC = rfc.slice(0,3) + 'X' + rfc.slice(4,10);
            rfc = nuevoRFC;
        }
        RFCP = rfc
    } else if(apaterno.length < 3 && !amaterno  && nombrenuevo.length >= 1) {
        const rfc = apaterno.slice(0, 1) + 'X' + nombrenuevo.slice(0,2) + fechaNacimiento.slice(2,4) + fechaNacimiento.slice(5,7) + fechaNacimiento.slice(8,10);
        RFCP = rfc
    };
    if (apaterno.length >= 3 && amaterno.length >= 1 && nombrenuevo.length >= 1) {
        let rfc = apaterno.slice(0, 1) + primeraVocal + amaterno.slice(0, 1) + nombrenuevo.slice(0,1) + fechaNacimiento.slice(2,4) + fechaNacimiento.slice(5,7) + fechaNacimiento.slice(8,10);
        if(nombresBaneados.includes(rfc.slice(0,4).toUpperCase())){
            let nuevoRFC = rfc.slice(0,3) + 'X' + rfc.slice(4,10);
            rfc = nuevoRFC;
        }
        RFCP = rfc;
    } else if(apaterno.length >= 3 && !amaterno  && nombrenuevo.length >= 1) {
        const rfc = apaterno.slice(0, 1) + primeraVocal + 'X' + nombrenuevo.slice(0,1) + fechaNacimiento.slice(2,4) + fechaNacimiento.slice(5,7) + fechaNacimiento.slice(8,10);
        RFCP = rfc;
    }
    return RFCP;
}

function obtenerPrimeraVocal(palabra) {
    palabra = palabra;
    const vocales = ['A','E','I','O','U'];
    for (var i = 1; i < palabra.length; i++) {
        if (vocales.includes(palabra[i])) {
            return palabra[i];
        }
    }
}

export default createRFC