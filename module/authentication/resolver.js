import connection from "../../Config/connectionSQL.js";
import jsonwebtoken from "jsonwebtoken";
import { GraphQLError } from "graphql";
import "dotenv/config";

const createToken = (user, secret, expiresIn) => {
    const {idUsuario, nombre, tipo} = user;
    return jsonwebtoken.sign( { idUsuario, nombre, tipo }, secret,{ expiresIn });
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
                    `   SELECT idUsuario, CONCAT(nombre, " ", aPaterno, " ", aMaterno) AS nombre, usuario, password, tipo FROM usuarios WHERE usuario = ? AND password = ? AND (tipo = 2 OR tipo = 1)
                    `,[input.usuario, input.password]
                );

                if(user.length > 0){
                    return {
                        token: createToken(user[0], process.env.SECRETA, '24H')
                    };
                }else{
                    return {token: ""};
                }
                
            } catch (error) {
                console.log(error);

                throw new GraphQLError("Error al iniciar sesión", {
                    extensions: {
                        code: "BAD_REQUEST",
                        http: { status: 400 },
                        originalError: error.message,
                    }
                });
            }

        },
        loginCobrador: async(_,{input}) => {
            try {
                const [user] = await connection.query(
                    `   SELECT idUsuario, CONCAT(nombre, " ", aPaterno, " ", aMaterno) AS nombre, usuario, password, tipo FROM usuarios WHERE usuario = ? AND password = ? AND tipo = 3
                    `,[input.usuario, input.password]
                );

                if(user.length > 0){
                    return {
                        token: createToken(user[0], process.env.SECRETA, '24H')
                    };
                }else{
                    return {token: ""};
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
