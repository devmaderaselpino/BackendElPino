
import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";
import { keyFromMaybeUrl, toPublicUrlFromKey as r2PublicUrlFromKey} from "../../r2.js";

export const fileResolvers = {
  
    Mutation: {
        updateArchivoCliente: async (_parent, { idCliente, archivo }) => {
            try {
                if (!idCliente || !archivo) {
                    throw new GraphQLError("idCliente y archivo son requeridos", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                const key = keyFromMaybeUrl(String(archivo).trim());
                
                if (!key) {
                    throw new GraphQLError("Archivo inválido", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                
                const url = r2PublicUrlFromKey(key);

                const [[documentos]] = await connection.query(
                    `   
                        SELECT COUNT(*) AS total FROM documentos WHERE idCliente = ?
                    `, [idCliente]
                );

                if(documentos.total > 0){
                    const [result] = await connection.query(
                        `UPDATE documentos SET url = ? WHERE idCliente = ?`,
                        [url, idCliente]
                    );

                    return { id: result.insertId, idCliente, archivo: url };
                }

                if(documentos.total === 0){
                    const [result] = await connection.query(
                        `INSERT INTO documentos (idCliente, url) VALUES (?, ?)`,
                        [idCliente, url]
                    );
                    return { id: result.insertId, idCliente, archivo: url };
                }


            } catch (err) {
                console.error("Error saveArchivoCliente:", err);
                throw new GraphQLError("No se pudo actualizar el archivo", {
                    extensions: { code: "DB_INSERT_FAILED" },
                });
            }
        },
        saveArchivoCliente: async (_parent, { idCliente, archivo }) => {
            try {
                if (!idCliente || !archivo) {
                    throw new GraphQLError("idCliente y archivo son requeridos", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                const key = keyFromMaybeUrl(String(archivo).trim());
                
                if (!key) {
                    throw new GraphQLError("Archivo inválido", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                
                const url = r2PublicUrlFromKey(key);

                const [result] = await connection.query(
                    `INSERT INTO documentos (idCliente, url) VALUES (?, ?)`,
                    [idCliente, url]
                );

                return { id: result.insertId, idCliente, archivo: url };

            } catch (err) {
                console.error("Error saveArchivoCliente:", err);
                throw new GraphQLError("No se pudo guardar el archivo", {
                    extensions: { code: "DB_INSERT_FAILED" },
                });
            }
        },
    },
};

export default fileResolvers;
