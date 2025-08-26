const routedSchema = `#graphql

    type Cobrador {
        idUsuario: Int
        nombre: String
        aPaterno: String
        aMaterno: String
        celular: String
    }

    type Cliente {
        idCliente: Int!
        nombreCliente: String!
        direccion: String!
        municipio: String!
        celular: String!
        distinguido: Int!
        abonos_atrasados: Int
        num_pendientes: Int
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
    
    type CrearRuta{
        success: Boolean!
        message: String
        idRuta: Int
    }
    type ClientesPorCobrador {
        idCobrador: ID!
        total_clientes: Int!
    }

    input AsignacionRutaInput {
        idCobrador: Int!
        idRuta: Int!
        idCliente: Int!
    }

    input EliminarAsignacionInput {
        idCobrador: Int!
        idRuta: Int!
        idCliente: Int!
    }

    type Query {
        getCobradores: [Cobrador]
        getClientesSinAsignar: [Cliente!]!
        getRutas(idCobrador: Int!): [Ruta]
        getClientesByCobrador(nombre: String): [Cliente]
        getTotalesClientesAsignados: [ClientesPorCobrador!]!
    }

    type Mutation {
        asignarClienteARuta(input: AsignacionRutaInput!): Boolean
        eliminarClienteDeRuta(input: EliminarAsignacionInput!): Boolean
        crearRuta(idCobrador: Int!): CrearRuta!
    }

`;
export default routedSchema;
