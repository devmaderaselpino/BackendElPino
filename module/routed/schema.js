const routedSchema = `#graphql

    type Cobrador {
        idUsuario: Int
        nombre: String
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

    input AsignacionRutaInput {
        idCobrador: Int!
        idCliente: Int!
    }

    input EliminarAsignacionInput {
        idCliente: Int!
    }

    type Query {
        getCobradores: [Cobrador]
        getClientesSinAsignar: [Cliente!]!
        getRutas(idCobrador: Int!): [Ruta]
        getClientesByCobrador: [Cliente]
    }

    type Mutation {
        asignarClienteARuta(input: AsignacionRutaInput!): Boolean
        eliminarClienteDeRuta(input: EliminarAsignacionInput!): Boolean
    }

`;
export default routedSchema;
