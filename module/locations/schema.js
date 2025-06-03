const locationSchema = `#graphql

    type Colonia {
        idColonia: Int 
        nombre: String
    }

    type Municipio {
        idMunicipio: Int 
        nombre: String
    }

    type Query {
        getColonias(filter: Int): [Colonia]
        getMunicipios: [Municipio]
    }
    
`
export default locationSchema