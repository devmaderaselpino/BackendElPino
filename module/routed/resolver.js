import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const routedResolver = {
    Query: {
        getCobradores: async () => {
            try {
                const [Cobradores] = await connection.query(`
                    SELECT idUsuario, nombre FROM usuarios WHERE tipo = 3;
                `);
                return Cobradores;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al obtener el Cobrador.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },

        getClientesSinAsignar: async () => {
            try {
                const [ClientesSinCobrador] = await connection.query(`
                    SELECT 
                    DISTINCT c.idCliente,
                    CONCAT(c.nombre, ' ', c.aPaterno, ' ', c.aMaterno) AS nombreCliente,
                    CONCAT(' ', col.nombre, ' calle ', c.calle, ' num: ', c.numero_ext) AS direccion,
                    m.nombre AS municipio
                    FROM clientes c
                    JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                    JOIN municipios m ON c.municipio = m.idMunicipio
                    JOIN colonias col ON col.idColonia = c.colonia
                    WHERE NOT EXISTS (
                    SELECT 1 FROM asignacion_rutas ar WHERE ar.idCliente = c.idCliente
                    );
                `);
                return ClientesSinCobrador;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al obtener clientes sin cobrador.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },
        getRutas: async (_, { idCobrador }) => {
            try {
                const [rows] = await connection.query(`
                    SELECT DISTINCT
                        ar.idRuta,
                        ar.idCobrador,
                        u.nombre AS nombreCobrador,
                        c.idCliente,
                        CONCAT(c.nombre, ' ', c.aPaterno, ' ', c.aMaterno) AS nombreCliente,
                        CONCAT('colonia: ', col.nombre, ' calle: ', c.calle, ' num: ', c.numero_ext) AS direccion,
                        c.celular,
                        c.distinguido,
                        m.nombre AS municipio
                        FROM asignacion_rutas ar
                        JOIN usuarios u ON ar.idCobrador = u.idUsuario
                        LEFT JOIN clientes c ON ar.idCliente = c.idCliente
                        LEFT JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                        LEFT JOIN colonias col ON col.idColonia = c.colonia
                        LEFT JOIN municipios m ON c.municipio = m.idMunicipio
                        WHERE ar.idCobrador = ?
                        ORDER BY ar.idRuta, c.nombre
                `, [idCobrador]);

                if (!rows.length) return [];

                const rutasMap = new Map();

                for (const row of rows) {
                    if (!rutasMap.has(row.idRuta)) {
                        rutasMap.set(row.idRuta, {
                            idRuta: row.idRuta,
                            idCobrador: row.idCobrador,
                            name: `Ruta ${row.idRuta}`,
                            description: `Ruta del cobrador ${row.nombreCobrador}`,
                            color: "#026804", 
                            clientes: [],
                        });
                    }

                    if (row.idCliente) {
                        rutasMap.get(row.idRuta).clientes.push({
                            idCliente: row.idCliente,
                            nombreCliente: row.nombreCliente,
                            direccion: row.direccion,
                            celular: row.celular,
                            municipio: row.municipio,
                            distinguido: row.distinguido || 0,
                        });
                    }
                }

                return Array.from(rutasMap.values());
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al obtener las rutas.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },
        getClientesByCobrador: async (_, { nombre, tipo }, ctx) => {
            try {
                const condicionNombre = nombre
                ? `AND CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) LIKE ?`
                : "";

                const condicionPendientes = tipo === 2
                ? `AND (
                    SELECT COUNT(*) FROM abonos_programados ap
                    WHERE ap.idCliente = ar.idCliente
                    AND ap.pagado = 0
                    AND ap.status = 1
                    AND ap.fecha_programada <= LAST_DAY(CURDATE())
                ) > 0`
                : "";

                const query = `
                    SELECT 
                        c.idCliente, c.distinguido,
                        CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombreCliente, 
                        CONCAT(m.nombre, ", ", col.nombre, ", ", c.calle, " #", c.numero_ext) AS direccion
                        FROM asignacion_rutas ar
                        INNER JOIN ventas v ON ar.idCliente = v.idCliente AND v.status = 1
                        INNER JOIN clientes c ON ar.idCliente = c.idCliente
                        INNER JOIN municipios m ON c.municipio = m.idMunicipio
                        INNER JOIN colonias col ON c.colonia = col.idColonia
                        WHERE ar.idCobrador = ?
                        ${condicionNombre}
                        ${condicionPendientes}
                        GROUP BY ar.idCliente
                `;

                const parametros = [ctx.usuario.idUsuario];
                if (nombre) parametros.push(`%${nombre}%`);

                const [clientes] = await connection.query(query, parametros);

                return clientes;
            } catch (error) {
                console.log(error);
                return [];
            }
        }
    },

    Mutation: {
        asignarClienteARuta: async (_, { input }) => {
                const { idCobrador, idCliente, idRuta } = input;

                try {
                    const [result] = await connection.query(
                        `INSERT INTO asignacion_rutas (idRuta, idCobrador, idCliente)
                        SELECT ?, ?, c.idCliente
                        FROM clientes c
                        JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                        WHERE c.idCliente = ?;`,
                        [idRuta, idCobrador, idCliente]
                    );

                    return result.affectedRows > 0;
                } catch (error) {
                    console.error(error);
                    throw new GraphQLError("Error al asignar cliente a una ruta.", {
                        extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                    });
                }
        },
        eliminarClienteDeRuta: async (_, { input }) => {
            const { idCliente } = input;
            try {
                const [result] = await connection.query(
                    `DELETE ar
                        FROM asignacion_rutas ar
                        JOIN clientes c ON ar.idCliente = c.idCliente
                        JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                        WHERE ar.idCliente = ?;`,
                    [idCliente]
                );
                return true;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al eliminar la asignación.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },
        crearRuta: async (_, { idCobrador }) => {
            try {
               
                const [result] = await connection.query(
                    `SELECT MAX(idRuta) as maxRuta FROM asignacion_rutas WHERE idCobrador = ?`,
                    [idCobrador]
                );

                const nuevoIdRuta = (result[0].maxRuta || 0) + 1;

                await connection.query(
                    `INSERT INTO asignacion_rutas (idRuta, idCobrador, idCliente) VALUES (?, ?, NULL)`,
                    [nuevoIdRuta, idCobrador]
                );

                return {
                    success: true,
                    message: 'Ruta creada exitosamente',
                    idRuta: nuevoIdRuta
                };
            } catch (error) {
                console.error('Error al crear la ruta:', error);
                throw new GraphQLError('Error al crear la ruta');
            }
        },
        eliminarClienteDeRuta: async (_, { input }) => {
            const { idCliente } = input;
            try {
                const [result] = await connection.query(
                    `DELETE ar
                        FROM asignacion_rutas ar
                        JOIN clientes c ON ar.idCliente = c.idCliente
                        JOIN ventas v ON v.idCliente = c.idCliente AND v.status = 1
                        WHERE ar.idCliente = ?;`,
                    [idCliente]
                );
                return true;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al eliminar la asignación.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                });
            }
        },
    },
};

export default routedResolver;
