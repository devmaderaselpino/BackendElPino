const locationSchema = `#graphql

    type Colonia {
        idColonia: Int 
        nombre: String
        idMunicipio: Int
        cp: Int
        status: Int
        nombreMunicipio: String
    }

    type Municipio {
        idMunicipio: Int 
        nombre: String
        status: Int
    }
    
    type ColoniasPaginated {
        total: Int
        items: [Colonia]
    }

    input MunicipioInput {
        idMunicipio: Int 
        nombre: String
    }

    input ColoniaInput {
        idColonia: Int
        idMunicipio: Int 
        nombre: String
        cp: Int
    }

    type Query {
        getColonias(filter: Int): [Colonia]
        getColoniasList: [Colonia]
        getColoniasPaginated(skip: Int = 0, limit: Int = 10): ColoniasPaginated
        getColonia(idColonia: Int): Colonia
        getMunicipios: [Municipio]
        getMunicipiosList: [Municipio]
        getMunicipio(idMunicipio: Int): Municipio
    }

    type Mutation {
        updateCity(input: MunicipioInput): String
        updateDistrict(input: ColoniaInput): String
        insertCity(nombre: String): String
        insertDistrict(input: ColoniaInput): String
        deleteCity(idMunicipio: Int) : String
        activateCity(idMunicipio: Int): String
        deleteDistrict(idColonia: Int) : String
        activateDistrict(idColonia: Int): String
    }
    
`
export default locationSchema