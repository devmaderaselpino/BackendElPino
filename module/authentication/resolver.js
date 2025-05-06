import connection from "../../Config/connectionSQL.js";
import jsonwebtoken from "jsonwebtoken";
import { GraphQLError } from "graphql";
import "dotenv/config";
import bcrypt from 'bcrypt';
import createRFC from "../../functions/createRFC.js";

const createToken = (user, secret, expiresIn) => {
    const {idUsuario, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, correo, celular, ultima_sesion, idCliente, idProspecto} = user;
    return jsonwebtoken.sign(user, secret,{expiresIn});
}

const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds);

const authenticationResolver = {
    Query : {
        RevelarToken: async(_,{token}) => {
            const tokenUser = jsonwebtoken.verify(token, process.env.SECRETA);
            return tokenUser;
        },
        prueba: (_,{fecha}) => {
            console.log(fecha);
            const rfc = createRFC("Ronaldo","Guillen","Flores",fecha)
            return rfc.toString();
        }
    },
    Mutation : {
        loginCliente: async(_,{input}) => {
            try {
                const [user] = await connection.query(
                    `
                        SELECT password, idUsuario
                        FROM usuarios_clientes_app
                        WHERE celular=?
                    `,[input.celular]
                );
                if (bcrypt.compareSync(input.password, user[0].password)) {
                    const [usuario] = await connection.query(
                        `
                            SELECT idUsuario, nombre, apellido_paterno, apellido_materno, fecha_nacimiento,
                            correo, celular, ultima_sesion, idCliente ,idSolicitud
                            FROM usuarios_clientes_app
                            WHERE idUsuario=?;
                        `,[user[0].idUsuario]
                    );
                    return {
                        token: createToken(usuario[0], process.env.SECRETA, '24H')
                    };
                }else{
                    return "";
                }
            } catch (error) {
                console.log(error);
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
        userRegister: async(_,{inputUser, inputProspect}) => {
            const {first_name, dad_last_name, mom_last_name, birth_day, cellphone, email, from_where} = inputProspect;
            const {nombre, apellido_paterno, apellido_materno, fecha_nacimiento, correo, celular, password} = inputUser;
            if (!first_name || !dad_last_name || !mom_last_name || !birth_day ||  !cellphone || !email || !from_where) {
                console.log("--------- ALGUNOS DATOS DEL INPUT PROSPECTO ESTAN VACIOS ----------")
               return false 
            }
            if (!nombre || !apellido_paterno || !apellido_materno || !fecha_nacimiento || !correo || !celular || !password) {
                console.log("--------- ALGUNOS DATOS DEL INPUT USUARIO ESTAN VACIOS ----------")
                return false
            }
            const rfc = createRFC(first_name, dad_last_name, mom_last_name, birth_day)
            const conn = await connection.getConnection()
            try {
                const hash = bcrypt.hashSync(password, salt);
                console.log(hash);
                await conn.beginTransaction();
                const idProspecto = await conn.execute(
                    `
                       INSERT INTO prospectos SET first_name=?, dad_last_name=?, mom_last_name=?, birth_day=?, RFC=?, cellphone=?, email=?, from_where=?, comments="Prospecto de aplicación"; 
                    `,[first_name, dad_last_name, mom_last_name, birth_day, rfc, cellphone, email, from_where]
                );
                console.log(idProspecto[0].insertId)
                await conn.execute(
                    `
                        INSERT INTO usuarios_clientes_app SET nombre=?, apellido_paterno=?, apellido_materno=?, fecha_nacimiento=?, rfc=?, correo=?,celular=? ,password=?, idProspecto=?;
                    `,[nombre, apellido_paterno, apellido_materno, fecha_nacimiento, rfc, correo, celular, hash, idProspecto[0].insertId]
                );
                await conn.commit();
                return true
            } catch (error) {
                await conn.rollback();
                console.log(error);
                throw new GraphQLError("Error al registrar nuevo usuario",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        }
    }
};

export default authenticationResolver;