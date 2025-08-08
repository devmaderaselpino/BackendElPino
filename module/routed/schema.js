const routedSchema = `#graphql

    type Cobrador {
        idUsuario: Int
        nombre: String
        Apaterno: String
        celular: String
    }

    type Cliente {
        idCliente: Int!
        nombreCliente: String!
        direccion: String!
        municipio: String!
        distinguido: Int
    }

    type Ruta {
        idRuta: Int
        idCobrador:Int   
        description: String
        color: String
        clientes: [Cliente]
    }
    
    type CrearRutaResponse {
        success: Boolean!
        message: String!
        idRuta: Int
    }

    input AsignacionRutaInput {
        idCobrador: Int!
        idRuta: Int!
        idCliente: Int!
    }

    input EliminarAsignacionInput {
        idCliente: Int!
    }

    type Query {
        getCobradores: [Cobrador]
        getClientesSinAsignar: [Cliente!]!
        getRutas(idCobrador: Int!): [Ruta]
        getClientesByCobrador(nombre: String, tipo: Int): [Cliente]
    }

    type Mutation {
        asignarClienteARuta(input: AsignacionRutaInput!): Boolean
        eliminarClienteDeRuta(input: EliminarAsignacionInput!): Boolean
        crearRuta(idCobrador: Int!): CrearRutaResponse!
    }

`;
export default routedSchema;
