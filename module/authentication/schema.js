const authenticationSchema = `#graphql
    type usuarioLogin {
        idUsuario: Int
        nombre: String
        apellido_paterno: String
        apellido_materno: String
        fecha_nacimiento: String
        correo: String
        celular: String
        ultinma_sesion: String
        idSolicitud: Int
        idCliente: Int
    }

    type token {
        token: String
    }

    input userRegisterInput {
        nombre: String
        apellido_paterno: String
        apellido_materno: String
        fecha_nacimiento: String
        correo: String
        celular: String
        password: String
    }

    input prospectInput {
        first_name: String
        dad_last_name: String
        mom_last_name: String
        birth_day: String
        cellphone: String
        email: String
        from_where: String
    }
    type Query {
        RevelarToken(token: String!) : usuarioLogin
        prueba(fecha: String): String
    }
    type Mutation {
        loginCliente(input: userRegisterInput) : token
        userRegister(inputUser: userRegisterInput, inputProspect: prospectInput) : Boolean
    }
`
export default authenticationSchema