import { format } from "@formkit/tempo";
import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";
import formatPrice from "../../functions/FormatPrice.js";
import { diffMonths } from "@formkit/tempo";
import mazatlanHora from "../../functions/MazatlanHora.js";

const paymentResolver = {
    Query : {
        getPayments: async (_,{ tipo }) => {
            try {
                
                const [currentPayments] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(abono),0) total FROM abonos
                            INNER JOIN ventas ON abonos.idVenta = ventas.idVenta
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(abonos.fecha_reg) = MONTH(?) AND YEAR(abonos.fecha_reg) = YEAR(?) AND abonos.status = 1
                    `, [tipo, mazatlanHora(), mazatlanHora()]
                );

                const [lastPayments] = await connection.query(
                    `   	
                        SELECT IFNULL(SUM(abono),0) total FROM abonos
                            INNER JOIN ventas ON abonos.idVenta = ventas.idVenta
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(abonos.fecha_reg) = MONTH(? - INTERVAL 1 MONTH)
                            AND YEAR(abonos.fecha_reg) = YEAR(? - INTERVAL 1 MONTH) AND abonos.status = 1

                    `, [tipo, mazatlanHora(), mazatlanHora()]
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
                        a.id AS numAbono,
                        a.abono AS abono, a.id, a.tipo,
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
                        WHERE a.tipo IN (1, 2, 3) AND a.status = 1
                        ORDER BY a.id DESC;
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
                        SELECT idAbonoProgramado, num_pago, cantidad, abono, interes, abono_interes, IFNULL(fecha_programada, "N/A") AS fecha_programada, IFNULL(fecha_liquido, "N/A") AS fecha_liquido, pagado FROM abonos_programados WHERE idVenta = ? AND status = 1
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
                       	
                    SELECT a.idVenta, a.id, a.abono, DATE_FORMAT(a.fecha_reg, "%Y-%m-%d %H:%i:%s") as fecha_reg, a.saldo_anterior, a.saldo_nuevo, CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre_cliente, ? AS cobrador, a.interes_anterior, a.interes_nuevo, a.liquidar,
                        (SELECT GROUP_CONCAT(CONCAT(productos_venta.cantidad, " X ", productos.descripcion) SEPARATOR ',') AS productos
                            FROM ventas 
                            INNER JOIN productos_venta ON ventas.idVenta = productos_venta.idVenta
                            INNER JOIN productos ON productos_venta.idProducto = productos.idProducto
                            WHERE ventas.idVenta = v.idVenta
                        ) AS productos,
                        a.usuario_reg
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
        },
        getPaymentsByCobradorAPP: async (_,{}, ctx) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                       	
                    SELECT a.idVenta, a.id, a.abono, DATE_FORMAT(a.fecha_reg, "%Y-%m-%d %H:%i:%s") as fecha_reg, a.saldo_anterior, a.saldo_nuevo, CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre_cliente, ? AS cobrador, a.interes_anterior, a.interes_nuevo, a.liquidar,
                        (SELECT GROUP_CONCAT(CONCAT(productos_venta.cantidad, " X ", productos.descripcion) SEPARATOR ',') AS productos
                            FROM ventas 
                            INNER JOIN productos_venta ON ventas.idVenta = productos_venta.idVenta
                            INNER JOIN productos ON productos_venta.idProducto = productos.idProducto
                            WHERE ventas.idVenta = v.idVenta
                        ) AS productos,
                        a.usuario_reg
                        FROM abonos a
                        INNER JOIN ventas v ON a.idVenta = v.idVenta AND v.tipo <> 1
                        INNER JOIN clientes c ON v.idCliente = c.idCliente
                        WHERE a.usuario_reg = ? AND a.tipo = 1 AND a.status = 1
                    
                    UNION 
	
                    SELECT a.idVenta, a.id, a.abono,DATE_FORMAT(a.fecha_reg, "%Y-%m-%d %H:%i:%s") AS fecha_reg, a.saldo_anterior, a.saldo_nuevo, CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre_cliente, "" AS cobrador, a.interes_anterior, a.interes_nuevo, a.liquidar, "" AS productos, a.usuario_reg
                        FROM abonos a
                        INNER JOIN ventas v ON a.idVenta = v.idVenta AND v.tipo <> 1
                        INNER JOIN clientes c ON v.idCliente = c.idCliente
                        WHERE a.usuario_reg <> ? AND a.status = 1 AND v.idCliente IN (SELECT ar.idCliente FROM asignacion_rutas ar WHERE ar.idCobrador = ? AND ar.status = 1)
                        AND a.fecha_reg BETWEEN 
                            DATE_ADD(?, INTERVAL -(DAYOFWEEK(?)-1 + 7) DAY)
                        AND DATE_ADD(?, INTERVAL (7 - DAYOFWEEK(?)) DAY); 


                    `, [ctx.usuario.nombre, ctx.usuario.idUsuario, ctx.usuario.idUsuario, ctx.usuario.idUsuario, mazatlanHora(), mazatlanHora(), mazatlanHora(), mazatlanHora()]
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
        getSalesPaymentsApp: async (_,{}, ctx) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                        SELECT 
                            ap.idAbonoProgramado AS id, ap.idVenta, ap.num_pago, ap.cantidad, ap.abono, ap.interes, ap.abono_interes, 
                            IFNULL(ap.fecha_programada, "N/A") AS fecha_programada, IFNULL(ap.fecha_liquido, "N/A") AS fecha_liquido, ap.pagado 
                            FROM abonos_programados ap 
                            WHERE ap.status = 1 AND ap.idCliente IN (SELECT ar.idCliente FROM asignacion_rutas ar WHERE ar.idCobrador = ? AND ar.status = 1)
                    `, [ctx.usuario.idUsuario]
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
        getTicketInfo: async (_,{idAbono}) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                    SELECT a.id, a.abono, a.idVenta, DATE_FORMAT(a.fecha_reg, '%d/%m/%Y %H:%i:%s') AS fecha_reg,
                        CONCAT_WS(" ", c.nombre, c.aPaterno, c.aMaterno) AS cliente, c.celular,
                        CONCAT_WS(" ", u.nombre, u.aPaterno, u.aMaterno) AS usuario_reg,
                        a.saldo_anterior, a.saldo_nuevo, a.interes_nuevo, a.interes_anterior, a.liquidar,
                        (SELECT GROUP_CONCAT(CONCAT(productos_venta.cantidad, " X ", productos.descripcion) SEPARATOR ',')
                            FROM ventas 
                            INNER JOIN productos_venta ON ventas.idVenta = productos_venta.idVenta
                            INNER JOIN productos ON productos_venta.idProducto = productos.idProducto
                            WHERE ventas.idVenta = v.idVenta
                        ) AS productos
                        FROM abonos a 
                        INNER JOIN usuarios u ON a.usuario_reg = u.idUsuario
                        INNER JOIN ventas v ON a.idVenta = v.idVenta
                        INNER JOIN clientes c ON v.idCliente = c.idCliente
                        WHERE a.id = ?

                    `, [idAbono]
                );

               return payments[0];

            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al info del pago.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
    },
    Mutation : {
        insertPayment: async(_,{ abono, idVenta, saldo_anterior, saldo_nuevo, liquidado }, ctx) => {

            function padToNextLine(text, cols = 32) {
                const len = text.length;
                const resto = len % cols;

                if (resto === 0) return text;

                return text + " ".repeat(cols - resto);
            }

            try {

                const [[interes1]] = await connection.query(`
                    SELECT SUM(interes - abono_interes) AS interes FROM abonos_programados WHERE STATUS = 1 AND idVenta = ? AND pagado = 0`, 
                    [idVenta]
                );

                const [pagos] = await connection.query(`
                    SELECT * FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1`, 
                    [idVenta]
                );

                let totalTicket = 0;
                let abonoRecibido = abono;
                
                for (const item of pagos) {
                    if (abonoRecibido <= 0) break;

                    const interesPendiente = parseFloat(item.interes - item.abono_interes); 
                    const capitalPendiente = parseFloat(item.cantidad - item.abono); 

                    if (interesPendiente > 0) {
                        const abonoParaInteres = Math.min(abonoRecibido, interesPendiente);

                        await connection.execute(
                            `UPDATE abonos_programados SET abono_interes = (abono_interes + ?) WHERE idAbonoProgramado = ?;`,
                            [abonoParaInteres, item.idAbonoProgramado]
                        );
                        abonoRecibido -= abonoParaInteres;
                        totalTicket += abonoParaInteres;
                        item.abono_interes += abonoParaInteres;
                    }

                    if (abonoRecibido <= 0) {
                    
                        continue;
                    }

                    if (capitalPendiente > 0) {
                        const abonoParaCapital = Math.min(abonoRecibido, capitalPendiente);

                        await connection.execute(
                            `UPDATE abonos_programados SET abono = (abono + ?) WHERE idAbonoProgramado = ?;`,
                            [abonoParaCapital, item.idAbonoProgramado]
                        );
                        abonoRecibido -= abonoParaCapital;
                        item.abono += abonoParaCapital; 
                    }

                    const totalAbonadoInteres = parseFloat(item.abono_interes);
                    console.log("Total abonado interes: ", totalAbonadoInteres);

                    const totalAbonadoCapital = parseFloat(item.abono);

                    if (totalAbonadoInteres >= item.interes && totalAbonadoCapital >= item.cantidad) {
                        await connection.execute(
                            `UPDATE abonos_programados SET pagado = 1, fecha_liquido = ? WHERE idAbonoProgramado = ?;`,
                            [mazatlanHora(), item.idAbonoProgramado]
                        );
                    }
                }

                const [[interes]] = await connection.query(`
                    SELECT SUM(interes - abono_interes) AS interes FROM abonos_programados WHERE STATUS = 1 AND idVenta = ? AND pagado = 0`, 
                    [idVenta]
                );

                const abonoInsert = await connection.execute(
                    `INSERT INTO abonos SET idVenta = ?, abono = ?, saldo_anterior = ?, saldo_nuevo = ?, fecha_reg = ?, usuario_reg = ?, tipo = 1, interes_anterior = ?, interes_nuevo = ?`,
                    [idVenta, abono, saldo_anterior, saldo_nuevo, mazatlanHora(), ctx.usuario.idUsuario,(interes1.interes), interes.interes]
                )

                if(liquidado === 1){
                    const [abonos_programados] = await connection.query( 
                        `UPDATE abonos_programados SET pagado = 1, fecha_liquido = ? WHERE idVenta = ? AND pagado = 0 AND status = 1;`,
                        [mazatlanHora(), idVenta]
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

                const [infoVenta]  = await connection.query(
                    `   
                       SELECT tipo, fecha, total FROM ventas WHERE idVenta = ?;
                    `, [idVenta]
                );

                let diferencia = diffMonths(new Date(), infoVenta[0].fecha);

                if(diferencia < 0) {
                    diferencia = diferencia * -1;
                }

                diferencia = diferencia + 1;
     
                const [[pendiente]] = await connection.query(
                    `   
                       SELECT SUM(cantidad - abono) AS cantidad_pendiente, SUM(interes-abono_interes) AS interes_pendiente FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1;
                    `, [idVenta]
                );
                
                let descuento = 0;
                
                let totalPendiente = pendiente.cantidad_pendiente;

                if(infoVenta[0].tipo === 2){
                    switch(diferencia){
                        case 1:
                            descuento = infoVenta[0].total * 0.275;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 2:
                            descuento = infoVenta[0].total * 0.20;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 3:
                            descuento = infoVenta[0].total * 0.15;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 4:
                            descuento = infoVenta[0].total * 0.10;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 5: 
                            descuento = infoVenta[0].total * 0.05;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        default: 
                            break;
                    }
                } else if(infoVenta[0].tipo === 3){
                    switch(diferencia){
                        case 1:
                            descuento = infoVenta[0].total * 0.275;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 2:
                            descuento = infoVenta[0].total * 0.20;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 3:
                            descuento = infoVenta[0].total * 0.18;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 4:
                            descuento = infoVenta[0].total * 0.16;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 5:
                            descuento = infoVenta[0].total * 0.14;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 6:
                            descuento = infoVenta[0].total * 0.12;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 7:
                            descuento = infoVenta[0].total * 0.10;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 8:
                            descuento = infoVenta[0].total * 0.08;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 9:
                            descuento = infoVenta[0].total * 0.06;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 10:
                            descuento = infoVenta[0].total * 0.04;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 11:
                            descuento = infoVenta[0].total * 0.02;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        default: 
                            break;
                    }
                }

                const actualizar = await connection.execute(
                    `UPDATE abonos SET liquidar = ?, saldo_nuevo = ? WHERE id = ?`,
                    [liquidado === 1 ? 0.00 : Math.ceil(totalPendiente + pendiente.interes_pendiente), liquidado === 1 ? 0.00 : saldo_anterior - (abono - totalTicket), abonoInsert[0].insertId]
                )

                const [productos] = await connection.query(
                    `   
                        SELECT CONCAT(productos_venta.cantidad," X ", productos.descripcion) AS productos
                            FROM ventas 
                            INNER JOIN productos_venta ON ventas.idVenta = productos_venta.idVenta
                            INNER JOIN productos ON productos_venta.idProducto = productos.idProducto
                            WHERE ventas.idVenta = ?;
                    `, [idVenta]
                );

                const [[cliente]] = await connection.query(
                    `   
                    SELECT  CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre
                        FROM ventas v
                        INNER JOIN clientes c ON v.idCliente = c.idCliente
                        WHERE v.idVenta = ? LIMIT 1;
                    `, [idVenta]
                );

                const productosString = productos
                    .map(p => padToNextLine(String(p.productos)))
                    .join("\n"); 

                const lineas = "\n--------------------------------";
                const lineas2 = "--------------------------------";
                
                const fecha = `Fecha: ${mazatlanHora()}`;
                const folio = `Folio: ${abonoInsert[0].insertId}`;
                const cantidadAbono = `Cantidad abono: ${formatPrice(abono)}`;
                const clientee = `Cliente: ${cliente.nombre}`;
                const venta = `No. Venta: ${idVenta}`;
                const cobrador = `Cobrador: ${ctx.usuario.nombre}`;

                const saldoAnterior = `Saldo anterior: ${formatPrice(saldo_anterior)}`;
                const interesAnterior = `Interes anterior: ${formatPrice(interes1.interes)}`;
                const saldoNuevo = liquidado === 1 ? 0.00 : saldo_anterior - (abono - totalTicket)
                const saldoActual = `Saldo actual: ${formatPrice(saldoNuevo)}`;
                const interesActual = interes1.interes - totalTicket > 0 ? `Interes actual: ${formatPrice(interes1.interes - totalTicket)}` : "Interes actual: $0.00";

                const liquidada = liquidado === 1 ? 0.00 : Math.ceil(totalPendiente + pendiente.interes_pendiente);
                const liquidar = `Para liquidar HOY: ${formatPrice(liquidada)}`;
  
                return `      RFC: IAIZ-760804-RW6      Allende #23, Centro, C.P 82800    El Rosario, Sinaloa, Mexico           Tel: 6942518833               Maderas y Ensambles                  "El Pino"${lineas}${padToNextLine("DATOS DEL ABONO")}${padToNextLine(fecha)}${padToNextLine(folio)}${padToNextLine(cantidadAbono)}${padToNextLine(clientee)}${padToNextLine(venta)}${padToNextLine(cobrador)}${lineas}${padToNextLine("PRODUCTOS")}${productosString}${lineas2}${padToNextLine("SALDOS")}${padToNextLine(saldoAnterior)}${padToNextLine(interesAnterior)}${padToNextLine(saldoActual)}${padToNextLine(interesActual)}${padToNextLine(liquidar)}\n\n${padToNextLine("      GRACIAS POR SU PAGO!")}`

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
        insertPaymentWithDigital: async(_,{ abono, idVenta, saldo_anterior, saldo_nuevo, liquidado }, ctx) => {

            function padToNextLine(text, cols = 32) {
                const len = text.length;
                const resto = len % cols;

                if (resto === 0) return text;

                return text + " ".repeat(cols - resto);
            }

            try {

                const [[interes1]] = await connection.query(`
                    SELECT SUM(interes - abono_interes) AS interes FROM abonos_programados WHERE STATUS = 1 AND idVenta = ? AND pagado = 0`, 
                    [idVenta]
                );

                const [pagos] = await connection.query(`
                    SELECT * FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1`, 
                    [idVenta]
                );

                let totalTicket = 0;
                let abonoRecibido = abono;
                
                for (const item of pagos) {
                    if (abonoRecibido <= 0) break;

                    const interesPendiente = parseFloat(item.interes - item.abono_interes); 
                    const capitalPendiente = parseFloat(item.cantidad - item.abono); 

                    if (interesPendiente > 0) {
                        const abonoParaInteres = Math.min(abonoRecibido, interesPendiente);

                        await connection.execute(
                            `UPDATE abonos_programados SET abono_interes = (abono_interes + ?) WHERE idAbonoProgramado = ?;`,
                            [abonoParaInteres, item.idAbonoProgramado]
                        );
                        abonoRecibido -= abonoParaInteres;
                        totalTicket += abonoParaInteres;
                        item.abono_interes += abonoParaInteres;
                    }

                    if (abonoRecibido <= 0) {
                    
                        continue;
                    }

                    if (capitalPendiente > 0) {
                        const abonoParaCapital = Math.min(abonoRecibido, capitalPendiente);

                        await connection.execute(
                            `UPDATE abonos_programados SET abono = (abono + ?) WHERE idAbonoProgramado = ?;`,
                            [abonoParaCapital, item.idAbonoProgramado]
                        );
                        abonoRecibido -= abonoParaCapital;
                        item.abono += abonoParaCapital; 
                    }

                    const totalAbonadoInteres = parseFloat(item.abono_interes);
                    console.log("Total abonado interes: ", totalAbonadoInteres);

                    const totalAbonadoCapital = parseFloat(item.abono);

                    if (totalAbonadoInteres >= item.interes && totalAbonadoCapital >= item.cantidad) {
                        await connection.execute(
                            `UPDATE abonos_programados SET pagado = 1, fecha_liquido = ? WHERE idAbonoProgramado = ?;`,
                            [mazatlanHora(), item.idAbonoProgramado]
                        );
                    }
                }

                const [[interes]] = await connection.query(`
                    SELECT SUM(interes - abono_interes) AS interes FROM abonos_programados WHERE STATUS = 1 AND idVenta = ? AND pagado = 0`, 
                    [idVenta]
                );

                const abonoInsert = await connection.execute(
                    `INSERT INTO abonos SET idVenta = ?, abono = ?, saldo_anterior = ?, saldo_nuevo = ?, fecha_reg = ?, usuario_reg = ?, tipo = 1, interes_anterior = ?, interes_nuevo = ?`,
                    [idVenta, abono, saldo_anterior, saldo_nuevo, mazatlanHora(), ctx.usuario.idUsuario,(interes1.interes), interes.interes]
                )

                if(liquidado === 1){
                    const [abonos_programados] = await connection.query( 
                        `UPDATE abonos_programados SET pagado = 1, fecha_liquido = ? WHERE idVenta = ? AND pagado = 0 AND status = 1;`,
                        [mazatlanHora(), idVenta]
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

                const [infoVenta]  = await connection.query(
                    `   
                       SELECT tipo, fecha, total FROM ventas WHERE idVenta = ?;
                    `, [idVenta]
                );

                let diferencia = diffMonths(new Date(), infoVenta[0].fecha);

                if(diferencia < 0) {
                    diferencia = diferencia * -1;
                }

                diferencia = diferencia + 1;
     
                const [[pendiente]] = await connection.query(
                    `   
                       SELECT SUM(cantidad - abono) AS cantidad_pendiente, SUM(interes-abono_interes) AS interes_pendiente FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1;
                    `, [idVenta]
                );
                
                let descuento = 0;
                
                let totalPendiente = pendiente.cantidad_pendiente;

                if(infoVenta[0].tipo === 2){
                    switch(diferencia){
                        case 1:
                            descuento = infoVenta[0].total * 0.275;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 2:
                            descuento = infoVenta[0].total * 0.20;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 3:
                            descuento = infoVenta[0].total * 0.15;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 4:
                            descuento = infoVenta[0].total * 0.10;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 5: 
                            descuento = infoVenta[0].total * 0.05;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        default: 
                            break;
                    }
                } else if(infoVenta[0].tipo === 3){
                    switch(diferencia){
                        case 1:
                            descuento = infoVenta[0].total * 0.275;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 2:
                            descuento = infoVenta[0].total * 0.20;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 3:
                            descuento = infoVenta[0].total * 0.18;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 4:
                            descuento = infoVenta[0].total * 0.16;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 5:
                            descuento = infoVenta[0].total * 0.14;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 6:
                            descuento = infoVenta[0].total * 0.12;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        case 7:
                            descuento = infoVenta[0].total * 0.10;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 8:
                            descuento = infoVenta[0].total * 0.08;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 9:
                            descuento = infoVenta[0].total * 0.06;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 10:
                            descuento = infoVenta[0].total * 0.04;
                            totalPendiente = totalPendiente - descuento; 
                            break;
                        case 11:
                            descuento = infoVenta[0].total * 0.02;
                            totalPendiente = totalPendiente - descuento;
                            break;
                        default: 
                            break;
                    }
                }

                const actualizar = await connection.execute(
                    `UPDATE abonos SET liquidar = ?, saldo_nuevo = ? WHERE id = ?`,
                    [liquidado === 1 ? 0.00 : Math.ceil(totalPendiente + pendiente.interes_pendiente), liquidado === 1 ? 0.00 : saldo_anterior - (abono - totalTicket), abonoInsert[0].insertId]
                )

                const [productos] = await connection.query(
                    `   
                        SELECT CONCAT(productos_venta.cantidad," X ", productos.descripcion) AS productos
                            FROM ventas 
                            INNER JOIN productos_venta ON ventas.idVenta = productos_venta.idVenta
                            INNER JOIN productos ON productos_venta.idProducto = productos.idProducto
                            WHERE ventas.idVenta = ?;
                    `, [idVenta]
                );

                const [[cliente]] = await connection.query(
                    `   
                    SELECT  CONCAT(c.nombre, " ", c.aPaterno, " ", c.aMaterno) AS nombre
                        FROM ventas v
                        INNER JOIN clientes c ON v.idCliente = c.idCliente
                        WHERE v.idVenta = ? LIMIT 1;
                    `, [idVenta]
                );

                const productosString = productos
                    .map(p => padToNextLine(String(p.productos)))
                    .join("\n"); 

                const saldoNuevo = liquidado === 1 ? 0.00 : saldo_anterior - (abono - totalTicket)
               
                const liquidada = liquidado === 1 ? 0.00 : Math.ceil(totalPendiente + pendiente.interes_pendiente);
               
                const ticketUrl = "https://res.cloudinary.com/dqh6utbju/image/upload/v1760036466/vnl14anlc53zwyxhfvmv.png";

                const phone = "526691498401"

                const msg = [
                `Hola, *${cliente.nombre}*`,
                `Hemos recibido correctamente tu pago de la venta *#${idVenta}* por *${formatPrice(abono)}*.`,
                ``,
                `- *Productos:* ${productosString}`,
                `- *Saldo actual:* ${formatPrice(saldoNuevo)}`,
                `- *Liquidas con:* ${formatPrice(liquidada)}`,
                ``,
                `Consulta tu ticket digital aquí:`,
                `${ticketUrl}`,
                ``,
                `_Gracias por tu pago y por confiar en nosotros!_`
                ].join('\n');

                const msgEncoded = encodeURIComponent(msg);

                return abonoInsert[0].insertId;


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
        cancelPayment: async(_, {idAbono}, ctx) => {
            try {

                const [[datos]] = await connection.query(
                    `   
                        SELECT abono, idVenta FROM abonos WHERE id = ?
                    `, [idAbono]
                );

                await connection.execute(
                    `
                       INSERT INTO abonos_cancelados SET idAbono = ?, cantidad = ?, fecha = ?, usuario_reg = ?; 
                    `,[idAbono, datos.abono, mazatlanHora(), ctx.usuario.idUsuario]
                );

                await connection.execute(
                    `
                       UPDATE abonos SET status = 0 WHERE id = ?; 
                    `,[idAbono]
                );

                const [abonos] = await connection.query(
                    `
                        SELECT idAbonoProgramado, cantidad, abono, interes, abono_interes FROM abonos_programados WHERE idVenta = ? AND (abono > 0 || abono_interes > 0) AND status = 1 ORDER BY idAbonoProgramado DESC;
                    `, [datos.idVenta]
                )

                let saldoAbono = datos.abono;
                let pagosActualizados = [...abonos];

                for (let i = 0; i < pagosActualizados.length; i++) {
                    let pago = pagosActualizados[i];

                    if (saldoAbono > 0 && pago.abono_interes > 0) {
                        const cantidadARestar = Math.min(saldoAbono, pago.abono_interes);
                        pago.abono_interes -= cantidadARestar;
                        saldoAbono -= cantidadARestar;
                    }

                    
                    if (saldoAbono > 0 && pago.abono > 0) {
                        const cantidadARestar = Math.min(saldoAbono, pago.abono);
                        pago.abono -= cantidadARestar;
                        saldoAbono -= cantidadARestar;
                    }

                    if (saldoAbono <= 0) {
                        break;
                    }
                }

                for (const pago of pagosActualizados){

                    const validar = ((pago.cantidad - pago.abono) + (pago.interes - pago.abono_interes)) <= 0;

                    if(validar){
                        await connection.execute(
                            `
                            UPDATE abonos_programados SET abono_interes = ?, abono = ? WHERE idAbonoProgramado = ?; 
                            `,[pago.abono_interes, pago.abono, pago.idAbonoProgramado]
                        );
                    }else{
                        await connection.execute(
                            `
                            UPDATE abonos_programados SET abono_interes = ?, abono = ?, pagado = 0, fecha_liquido = NULL WHERE idAbonoProgramado = ?; 
                            `,[pago.abono_interes, pago.abono, pago.idAbonoProgramado], 
                        );
                    }

                }

                const [[venta]] = await connection.query(
                    `   
                        SELECT status FROM ventas WHERE idVenta = ?
                    `, [datos.idVenta]
                );

                if(venta.status === 0){
                    await connection.execute(
                        `
                        UPDATE ventas SET status = 1 WHERE idVenta = ?; 
                        `,[datos.idVenta], 
                    );
                }

                await connection.execute(
                    `
                        UPDATE abonos_programados SET pagado = 0, fecha_liquido = NULL WHERE ((cantidad - abono) + (interes - abono_interes)) > 0 AND idVenta = ?; 
                    `,[datos.idVenta], 
                );
                
                return "Abono cancelado."

            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error cancelando abono.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        insertPagoViejo: async(_,{ abono, idVenta }, ctx) => {

            try {

                const [pagos] = await connection.query(`
                    SELECT * FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1`, 
                    [idVenta]
                );

                let abonoRecibido = abono;
                
                for (const item of pagos) {
                    if (abonoRecibido <= 0) break;

                    const interesPendiente = parseFloat(item.interes - item.abono_interes); 
                    const capitalPendiente = parseFloat(item.cantidad - item.abono); 

                    if (interesPendiente > 0) {
                        const abonoParaInteres = Math.min(abonoRecibido, interesPendiente);

                        await connection.execute(
                            `UPDATE abonos_programados SET abono_interes = (abono_interes + ?) WHERE idAbonoProgramado = ?;`,
                            [abonoParaInteres, item.idAbonoProgramado]
                        );
                        abonoRecibido -= abonoParaInteres;
                        item.abono_interes += abonoParaInteres;
                    }

                    if (abonoRecibido <= 0) {
                    
                        continue;
                    }

                    if (capitalPendiente > 0) {
                        const abonoParaCapital = Math.min(abonoRecibido, capitalPendiente);

                        await connection.execute(
                            `UPDATE abonos_programados SET abono = (abono + ?) WHERE idAbonoProgramado = ?;`,
                            [abonoParaCapital, item.idAbonoProgramado]
                        );
                        abonoRecibido -= abonoParaCapital;
                        item.abono += abonoParaCapital; 
                    }

                    const totalAbonadoInteres = parseFloat(item.abono_interes);
                    const totalAbonadoCapital = parseFloat(item.abono);

                    if (totalAbonadoInteres >= item.interes && totalAbonadoCapital >= item.cantidad) {
                        await connection.execute(
                            `UPDATE abonos_programados SET pagado = 1, fecha_liquido = ? WHERE idAbonoProgramado = ?;`,
                            [mazatlanHora(), item.idAbonoProgramado]
                        );
                    }
                }


                return "Todo bien"
                
            } catch (error) {
                console.log(error);
                
                throw new GraphQLError("Error validando abono.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
            }
        },
        subidaDatos: async (_, { abonos }, ctx) => {
            try {
                for (const abono of abonos) {
                    
                    const abonoInsert = await connection.execute(
                        `INSERT INTO abonos SET idVenta = ?, abono = ?, saldo_anterior = ?, saldo_nuevo = ?, fecha_reg = ?, usuario_reg = ?, tipo = 1, interes_anterior = ?, interes_nuevo = ?, liquidar = ?`,
                        [abono.idVenta, abono.abono, abono.saldo_anterior, abono.saldo_nuevo, abono.fecha_reg, abono.usuario_reg, abono.interes_anterior, abono.interes_nuevo, abono.liquidar]
                    )

                    const [pagos] = await connection.query(`
                        SELECT * FROM abonos_programados WHERE idVenta = ? AND pagado = 0 AND status = 1`, 
                        [abono.idVenta]
                    );
    
                    let abonoRecibido = abono.abono;
                    
                    for (const item of pagos) {
                        if (abonoRecibido <= 0) break;
    
                        const interesPendiente = parseFloat(item.interes - item.abono_interes); 
                        const capitalPendiente = parseFloat(item.cantidad - item.abono); 
    
                        if (interesPendiente > 0) {
                            const abonoParaInteres = Math.min(abonoRecibido, interesPendiente);
    
                            await connection.execute(
                                `UPDATE abonos_programados SET abono_interes = (abono_interes + ?) WHERE idAbonoProgramado = ?;`,
                                [abonoParaInteres, item.idAbonoProgramado]
                            );
                            abonoRecibido -= abonoParaInteres;
                            item.abono_interes += abonoParaInteres;
                        }
    
                        if (abonoRecibido <= 0) {
                        
                            continue;
                        }
    
                        if (capitalPendiente > 0) {
                            const abonoParaCapital = Math.min(abonoRecibido, capitalPendiente);
    
                            await connection.execute(
                                `UPDATE abonos_programados SET abono = (abono + ?) WHERE idAbonoProgramado = ?;`,
                                [abonoParaCapital, item.idAbonoProgramado]
                            );
                            abonoRecibido -= abonoParaCapital;
                            item.abono += abonoParaCapital; 
                        }
    
                        const totalAbonadoInteres = parseFloat(item.abono_interes);
                        const totalAbonadoCapital = parseFloat(item.abono);

                        if (totalAbonadoInteres >= item.interes && totalAbonadoCapital >= item.cantidad) {
                            await connection.execute(
                                `UPDATE abonos_programados SET pagado = 1, fecha_liquido = ? WHERE idAbonoProgramado = ?;`,
                                [abono.fecha_reg, item.idAbonoProgramado]
                            );
                        }
                    }

                    if(abono.liquidar === 0){
                        await connection.execute(
                            `UPDATE abonos_programados SET pagado = 1, fecha_liquido = ? WHERE idVenta = ? AND pagado = 0;`,
                            [abono.fecha_reg, abono.idVenta]
                        );

                        await connection.execute(
                            `UPDATE ventas SET status = 0 WHERE idVenta = ?;`,
                            [abono.idVenta]
                        );
                    }
                }

                return "Sexo anal"
            } catch (error) {
                console.log(error);
                
            }
        }
    }
    
};

export default paymentResolver;
