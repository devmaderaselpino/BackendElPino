import connection from "../../Config/connectionSQL.js";
import jsonwebtoken from "jsonwebtoken";
import { GraphQLError } from "graphql";
import "dotenv/config";

const createToken = (user, secret, expiresIn) => {
    //const {idUsuario, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, correo, celular, ultima_sesion, idCliente, idProspecto} = user;
    return jsonwebtoken.sign(user, secret,{expiresIn});
}

const authenticationResolver = {
    Query : {
        prueba: (_,{}) => {
            return "Hola pa";
        }
    },
    Mutation : {
        loginUser: async(_,{input}) => {
            try {
                const [user] = await connection.query(
                    `   SELECT usuario, password FROM usuarios WHERE usuario = ? AND password = ? AND tipo = 3
                    `,[input.usuario, input.password]
                );
                
                if(user.length > 0){
                    return {
                        token: createToken(user[0], process.env.SECRETA, '24H')
                    };
                }else{
                    return "";
                }
            } catch (error) {
                throw new GraphQLError("Error al iniciar sesión",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
    }
};

export default authenticationResolver;
