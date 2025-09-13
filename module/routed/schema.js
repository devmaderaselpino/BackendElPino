const routedSchema = `#graphql

    type Cobrador {
        idUsuario: Int
        nombre: String
        aPaterno: String
        aMaterno: String
        celular: String
    }

    type Cliente {
        idCliente: Int
        nombreCliente: String
        direccion: String
        municipio: String
        celular: String
        distinguido: Int
        abonos_atrasados: Int
        num_pendientes: Int
        num_abonos: Int
    }

    type ClienteDescarga {
        idCliente: Int
        nombreCliente: String
        direccion: String
        municipio: String
        colonia: String
        celular: String
        img_domicilio: String
        descripcion: String
        distinguido: Int
        abonos_atrasados: Int
        num_pendientes: Int
        num_abonos: Int
        orden: Int
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

    type ColoniaAsignada{
        colonia: Int
        nombre: String
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

    input ClienteEnrutado {
        idCliente: Int
        orden: Int
    }

    input Enrutado {
        ids: [ClienteEnrutado]
    }

    type Query {
        getCobradores: [Cobrador]
        getClientesSinAsignar: [Cliente!]!
        getRutas(idCobrador: Int!): [Ruta]
        getClientesByCobrador(nombre: String, colonia: Int): [Cliente]
        getTotalesClientesAsignados: [ClientesPorCobrador!]!
        getColoniasAsignadas: [ColoniaAsignada]
        getClienteDescarga: [ClienteDescarga]
    }

    type Mutation {
        asignarClienteARuta(input: AsignacionRutaInput!): Boolean
        eliminarClienteDeRuta(input: EliminarAsignacionInput!): Boolean
        crearRuta(idCobrador: Int!): CrearRuta!
        actualizarEnrutado(input: Enrutado): String
    }

`;
export default routedSchema;
