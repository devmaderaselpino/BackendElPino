import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const routedResolver = {
    Query: {
        getCobradores: async () => {
            try {
                const [Cobradores] = await connection.query(`
                    SELECT idUsuario, nombre, aPaterno, aMaterno,celular FROM usuarios WHERE tipo = 3;
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
                    const [rows] = await connection.query(`
                    SELECT 
                        c.idCliente,
                        CONCAT(c.nombre, ' ', c.aPaterno, ' ', c.aMaterno)    AS nombreCliente,
                        CONCAT(' ', col.nombre, ' calle ', c.calle, ' num: ', c.numero_ext) AS direccion,
                        m.nombre                                              AS municipio
                    FROM clientes c
                    JOIN municipios m ON c.municipio = m.idMunicipio
                    JOIN colonias   col ON col.idColonia = c.colonia
                    WHERE
                        EXISTS (
                        SELECT 1
                        FROM ventas v
                        WHERE v.idCliente = c.idCliente
                            AND v.status = 1
                        )
                        AND NOT EXISTS (
                        SELECT 1
                        FROM asignacion_rutas ar
                        WHERE ar.idCliente = c.idCliente
                            AND ar.status = 1
                        )
                    ORDER BY c.idCliente
                    `);
                    return rows;
                } catch (error) {
                    console.error(error);
                    throw new GraphQLError("Error al obtener clientes sin cobrador.", {
                    extensions: { code: "BAD_REQUEST", http: { status: 400 } },
                    });
                }
                },


        getRutas: async (_, { idCobrador }) => {
            try {
                const [rows] = await connection.query(
                `
              SELECT 
                r.idCobrador,
                u.nombre AS nombreCobrador,
                r.idRuta,
                c.idCliente,
                CONCAT(c.nombre, ' ', c.aPaterno, ' ', c.aMaterno) AS nombreCliente,
                CONCAT('colonia: ', col.nombre, ' calle: ', c.calle, ' num: ', c.numero_ext) AS direccion,
                m.nombre AS municipio,
                c.celular,
                c.distinguido
                    FROM (
                        SELECT DISTINCT idCobrador, idRuta
                        FROM asignacion_rutas
                        WHERE idCobrador = ? AND status = 1
                    ) r
                    JOIN usuarios u
                        ON u.idUsuario = r.idCobrador
                    LEFT JOIN asignacion_rutas ar
                        ON ar.idCobrador = r.idCobrador
                    AND ar.idRuta     = r.idRuta
                    AND ar.idCliente IS NOT NULL
                    AND ar.status     = 1
                    LEFT JOIN clientes c
                        ON c.idCliente = ar.idCliente
                    LEFT JOIN colonias col
                        ON col.idColonia = c.colonia
                    LEFT JOIN municipios m
                        ON m.idMunicipio = c.municipio
                    WHERE 
                        c.idCliente IS NULL
                        OR EXISTS (
                            SELECT 1
                            FROM ventas v
                            WHERE v.idCliente = c.idCliente
                            AND v.status = 1
                        )
                    ORDER BY r.idRuta, c.nombre, c.aPaterno, c.aMaterno;


                `,
                [idCobrador]
                );

                if (rows.length === 0) return [];

             
                const rutas = new Map();
                for (const row of rows) {
                if (!rutas.has(row.idRuta)) {
                    rutas.set(row.idRuta, {
                    idRuta: row.idRuta,
                    idCobrador: row.idCobrador,
                    name: `Ruta ${row.idRuta} de ${row.nombreCobrador}`,
                    description: "Clientes asignados",
                    color: "#3b82f6",
                    clientes: [],
                    });
                }
                if (row.idCliente) {
                    rutas.get(row.idRuta).clientes.push({
                    idCliente: row.idCliente,
                    nombreCliente: row.nombreCliente,
                    direccion: row.direccion,
                    municipio: row.municipio,
                    celular: row.celular,
                    distinguido: row.distinguido,
                    });
                }
                }

                return Array.from(rutas.values());
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al obtener las rutas.", {
                extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
            },
             getTotalesClientesAsignados: async () => {
                    try {
                        const [rows] = await connection.query(
                        `
                        SELECT idCobrador, COUNT(*) AS total_clientes
                        FROM asignacion_rutas
                        WHERE status = 1
                            AND idCliente IS NOT NULL
                        GROUP BY idCobrador
                        ORDER BY idCobrador
                        `
                        );
                       
                        return rows.map(r => ({
                        idCobrador: String(r.idCobrador),
                        total_clientes: Number(r.total_clientes) || 0,
                        }));
                    } catch (err) {
                        console.error("getTotalesClientesAsignados error:", err);
                        throw new GraphQLError("Error al obtener totales por cobrador");
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
        const { idCobrador, idRuta, idCliente } = input;
        const conn = connection;

        try {
            
            const [vta] = await conn.query(
            `SELECT 1 FROM ventas WHERE idCliente = ? AND status = 1 LIMIT 1`,
            [idCliente]
            );
            if (vta.length === 0) {
            throw new GraphQLError("El cliente no tiene venta activa.", {
                extensions: { code: "BAD_USER_INPUT" },
            });
            }

           
            const [dup] = await conn.query(
            `SELECT 1 FROM asignacion_rutas
                WHERE idCobrador = ? AND idRuta = ? AND idCliente = ? AND status = 1
                LIMIT 1`,
            [idCobrador, idRuta, idCliente]
            );
            if (dup.length > 0) return true;

           
            if (conn.beginTransaction) await conn.beginTransaction();

           
            const [upd] = await conn.query(
            `
            UPDATE asignacion_rutas
            SET idCliente = ?, status = 1
            WHERE idCobrador = ? AND idRuta = ?
                AND idCliente IS NULL
                AND status = 1
            LIMIT 1
            `,
            [idCliente, idCobrador, idRuta]
            );

            
            if (upd.affectedRows === 0) {
            await conn.query(
                `
                INSERT INTO asignacion_rutas (idCobrador, idRuta, idCliente, status)
                VALUES (?, ?, ?, 1)
                `,
                [idCobrador, idRuta, idCliente]
            );
            }

            if (conn.commit) await conn.commit();
            return true;
        } catch (error) {
            if (conn.rollback) await conn.rollback();
            console.error("Error al asignar cliente a la ruta:", {
            message: error.message,
            code: error.code,
            sql: error.sqlMessage,
            });
            throw new GraphQLError("Error al asignar cliente a la ruta.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
            });
        }
        },
       eliminarClienteDeRuta: async (_, { input }) => {
            const { idCobrador, idRuta, idCliente } = input;
            const conn = connection;
            try {
                
                const [upd] = await conn.query(
                `
                UPDATE asignacion_rutas
                SET status = 0
                WHERE idCobrador = ? AND idRuta = ? AND idCliente = ? AND status = 1
                `,
                [idCobrador, idRuta, idCliente]
                );

            
                const [activos] = await conn.query(
                `
                SELECT 1
                FROM asignacion_rutas
                WHERE idCobrador = ? AND idRuta = ? AND idCliente IS NOT NULL AND status = 1
                LIMIT 1
                `,
                [idCobrador, idRuta]
                );

                
                if (activos.length === 0) {
                await conn.query(
                    `
                    UPDATE asignacion_rutas
                    SET status = 0
                    WHERE idCobrador = ? AND idRuta = ? AND idCliente IS NULL
                    `,
                    [idCobrador, idRuta]
                );
                }

                return upd.affectedRows > 0;
            } catch (error) {
                console.error(error);
                throw new GraphQLError("Error al eliminar la asignación (lógica).", {
                extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
            },
     crearRuta: async (_, { idCobrador }) => {
            try {
                const [maxRes] = await connection.query(
                `SELECT COALESCE(MAX(idRuta), 0) AS maxRuta
                FROM asignacion_rutas
                WHERE idCobrador = ?`,
                [idCobrador]
                );
                const nuevoIdRuta = (maxRes[0]?.maxRuta || 0) + 1;

      
                const [ins] = await connection.query(
                `INSERT INTO asignacion_rutas (idRuta, idCobrador, idCliente, status)
                VALUES (?, ?, NULL, 1)`,
                [nuevoIdRuta, idCobrador]
                );

                return {
                success: ins.affectedRows > 0,
                message: "Ruta creada exitosamente",
                idRuta: nuevoIdRuta,
                };
            } catch (error) {
                console.error("Error al crear la ruta:", error);
                throw new GraphQLError("Error al crear la ruta.", {
                extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
            }




    },
};

export default routedResolver;
