import { format } from "@formkit/tempo";
import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";
import formatPrice from "../../functions/FormatPrice.js";

const paymentResolver = {
    Query : {
        getPayments: async (_,{ tipo }) => {
            try {
                
                const [currentPayments] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(abono),0) total FROM abonos
                            INNER JOIN ventas ON abonos.idVenta = ventas.idVenta
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(abonos.fecha_reg) = MONTH(CURDATE()) AND YEAR(abonos.fecha_reg) = YEAR(CURDATE())
                    `, [tipo]
                );

                const [lastPayments] = await connection.query(
                    `   	
                        SELECT IFNULL(SUM(abono),0) total FROM abonos
                            INNER JOIN ventas ON abonos.idVenta = ventas.idVenta
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(abonos.fecha_reg) = MONTH(CURDATE() - INTERVAL 1 MONTH)
                            AND YEAR(abonos.fecha_reg) = YEAR(CURDATE() - INTERVAL 1 MONTH)

                    `, [tipo]
                );

                return [
                    {
                        month: "Mes Anterior",
                        amount: lastPayments[0].total,
                        color: "#6b7280",
                    },
                    {
                        month: "Mes Actual",
                        amount: currentPayments[0].total,
                        color: "#10b981",
                    },
                ]

            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener pagos adeudados.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        GetAbonos: async (_,{}) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                    SELECT 
                        DATE_FORMAT(a.fecha_reg, '%Y-%m-%d') AS fecha,
                        CONCAT(c.nombre, ' ', c.apaterno, ' ', c.amaterno) AS cliente,
                        a.abono AS abono,
                        CASE a.tipo
                        WHEN 1 THEN 'Abono'
                        WHEN 2 THEN 'Enganche'
                        WHEN 3 THEN 'Apartado'
                        END AS tipo_abono,
                        u.nombre AS cobrador
                        FROM abonos a
                        JOIN usuarios u ON a.usuario_reg = u.idUsuario
                        JOIN ventas v ON a.idVenta = v.idVenta
                        JOIN clientes c ON v.idCliente = c.idCliente
                        WHERE a.tipo IN (1, 2, 3)
                        ORDER BY a.fecha_reg DESC;
                    `, 
                );
                
                return payments;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener pagos adeudados.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getPaymentsBySale: async (_,{ idVenta }) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                        SELECT idAbonoProgramado, num_pago, cantidad, abono, IFNULL(fecha_programada, "N/A") AS fecha_programada, IFNULL(fecha_liquido, "N/A") AS fecha_liquido, pagado FROM abonos_programados WHERE idVenta = ? AND status = 1
                    `, [idVenta]
                );

               return payments;

            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener pagos.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getPaymentsByCobrador: async (_,{}, ctx) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                       	
                    SELECT a.idVenta, a.id, a.abono, DATE_FORMAT(a.fecha_reg, "%Y-%m-%d %H:%i:%s") as fecha_reg, a.saldo_anterior, a.saldo_nuevo, CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre_cliente, ? AS cobrador
                        FROM abonos a
                        INNER JOIN ventas v ON a.idVenta = v.idVenta AND v.tipo <> 1
                        INNER JOIN clientes c ON v.idCliente = c.idCliente
                        WHERE a.usuario_reg = ? AND a.tipo = 1 AND a.status = 1 ORDER BY a.id DESC


                    `, [ctx.usuario.nombre, ctx.usuario.idUsuario]
                );

               return payments;

            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener pagos.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        }
    },
    Mutation : {
        insertPayment: async(_,{ abono, idVenta, saldo_anterior, saldo_nuevo, liquidado }, ctx) => {

            console.log(saldo_anterior);
            console.log(saldo_nuevo);
            

            try {

                const abonoInsert = await connection.execute(
                    `INSERT INTO abonos SET idVenta = ?, abono = ?, saldo_anterior = ?, saldo_nuevo = ?, fecha_reg = NOW(), usuario_reg = ?, tipo = 1`,
                    [idVenta, abono, saldo_anterior, saldo_nuevo, ctx.usuario.idUsuario]
                )

                const [pagos] = await connection.query(`
                    SELECT * FROM abonos_programados WHERE idVenta = ? AND pagado = 0`, 
                    [idVenta]
                );

                let abonoRecibido = abono;
                
                for (const item of pagos) {
                    
                    const pendiente = parseFloat(item.cantidad - item.abono);
                    if (abonoRecibido <= 0) break;

                    const abonoAportado = Math.min(abonoRecibido, pendiente);

                    if((abonoAportado + item.abono) === item.cantidad){
                        await connection.execute(
                            `UPDATE abonos_programados SET abono = (abono + ?), pagado = 1, fecha_liquido = NOW() WHERE idAbonoProgramado = ?;`,
                            [abonoAportado, item.idAbonoProgramado]
                        )
                    }else{
                        await connection.execute(
                            `UPDATE abonos_programados SET abono = (abono + ?) WHERE idAbonoProgramado = ?;`,
                            [abonoAportado, item.idAbonoProgramado]
                        )
                    }

                    abonoRecibido -= abonoAportado;
                }

                if(liquidado === 1){
                    const [abonos_programados] = await connection.query( 
                        `UPDATE abonos_programados SET pagado = 1, fecha_liquido = NOW() WHERE idVenta = ?;`,
                        [idVenta]
                    );
                }

                const [abonos_programados] = await connection.query(`
                    SELECT COUNT(*) AS total_pendiente FROM abonos_programados WHERE idVenta = ? AND pagado = 0`, 
                    [idVenta]
                );

                if(abonos_programados[0].total_pendiente === 0){
                    await connection.execute(
                        `UPDATE ventas SET status = 0 WHERE idVenta = ?;`,
                        [idVenta]
                    )
                }

                return `\n      RFC: IAIZ-760804-RW6\n Allende #23, Centro, C.P 82800\n  El Rosario, Sinaloa, Mexico\n       Tel: 6941166060\n--------------------------------\nDATOS DEL ABONO\nFecha: ${format(new Date(), "YYYY-MM-DD HH:mm:ss")}\nFolio: ${abonoInsert[0].insertId}\nCantidad abono: ${formatPrice(abono)}\n\nCliente: ${ctx.usuario.nombre}\nNo. Venta: ${idVenta}\nCobrador: ${ctx.usuario.nombre}\n--------------------------------\nSALDOS\nSaldo anterior: ${formatPrice(saldo_anterior)}\nInteres anterior: $0.00\nSaldo actual: ${formatPrice(saldo_nuevo)}\nInteres actual: $0.00\n\n      GRACIAS POR SU PAGO!`
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error insertando venta.",{
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

export default paymentResolver;
