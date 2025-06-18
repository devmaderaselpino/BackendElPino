const employeeSchema = `#graphql

    type User {
        idUsuario: Int
        nombre: String
        aPaterno: String
        aMaterno: String
        tipo: Int
        status: Int
        celular: String
        municipio: Int
        municipio_n: String
        colonia: Int
        colonia_n: String
        calle: String
        numero_ext: String
        usuario: String
        password: String
    }

    input UserInput {
        idUsuario: Int
        nombre: String
        aPaterno: String
        aMaterno: String
        tipo: Int
        celular: String
        municipio: Int
        colonia: Int
        calle: String
        numero_ext: String
        usuario: String
        password: String
    }

    type UsersPaginated {
        total: Int
        items: [User]
    }

    input PaginatedInput {
        skip: Int
        limit: Int
        searchName: String
    }

    type Query {
        getEmployeesPaginated(input: PaginatedInput): UsersPaginated
        getEmployee(idUsuario: Int): User
    }
    
    type Mutation {
        insertEmployee(input: UserInput): String
        deleteEmployee(idUsuario: Int): String
        activateEmployee(idUsuario: Int): String
        editEmployee(input: UserInput): String
    }
    
`
export default employeeSchema;
