const clientsSchema = `#graphql

    type Client {
        idCliente: Int 
        nombre: String
        aPaterno: String
        aMaterno: String
        municipio: Int
        municipio_n: String
        colonia: Int
        colonia_n: String
        calle: String
        numero_ext: String
        celular: String
        distinguido: Int
        img_domicilio: String
        descripcion: String
        fecha_reg: String
        status: Int
        saldo_favor: Float
        url: String
    }

    type ClientsPaginated {
        total: Int
        items: [Client]
    }

    input ClientsInput {
        idMunicipio: Int
        idColonia: Int
    }

    input ClientInput {
        idCliente: Int
        nombre: String
        aPaterno: String
        aMaterno: String
        municipio: Int
        colonia: Int
        calle: String
        numero_ext: String
        celular: String
        distinguido: Int
        img_domicilio: String
        descripcion: String
    }

    input PaginatedInput {
        idMunicipio: Int
        idColonia: Int
        skip: Int
        limit: Int
        searchName: String
    }

    type Query {
        getClientsByCollector: [Client]
        getClients(input:ClientsInput): [Client]
        getClient(idCliente:Int): Client
        getClientsPaginated(input: PaginatedInput) : ClientsPaginated
    }
    
    type Mutation {
        insertClient(input: ClientInput): [Client]
        insertValidatedClient(input: ClientInput): String
        updateClient(input: ClientInput): String
    }
    
`
export default clientsSchema