import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const salesResolver = {
    Query : {
       
        getSalesAmount: async (_,{ tipo }) => {
            
            try {
                
                const [currentSales] = await connection.query(
                    `   
                        SELECT IFNULL(SUM(total),0) AS total FROM ventas
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(ventas.fecha) = MONTH(CURDATE()) AND YEAR(ventas.fecha) = YEAR(CURDATE())
                    `, [tipo]
                );

                const [lastSales] = await connection.query(
                    `   	
                        SELECT IFNULL(SUM(total),0) AS total FROM ventas
                            INNER JOIN clientes ON ventas.idCliente = clientes.idCliente AND clientes.municipio = ?
                            WHERE MONTH(ventas.fecha) = MONTH(CURDATE() - INTERVAL 1 MONTH)
                            AND YEAR(ventas.fecha) = YEAR(CURDATE() - INTERVAL 1 MONTH)

                    `, [tipo]
                );

                return [
                    {
                        month: "Mes Anterior",
                        amount: lastSales[0].total,
                        color: "#6b7280",
                    },
                    {
                        month: "Mes Actual",
                        amount: currentSales[0].total,
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
        getSalesByClient: async (_, { input }) => {

            const {idCliente, status} = input;
            
            let queryStatus = "";

            if(status === 1){
                queryStatus = "AND status = 0"
            }

            if(status === 2){
                queryStatus = "AND status = 1"
            }

            if(status === 3){
                queryStatus = "AND status = 2"
            }

            const [ventas] = await connection.query(
                `SELECT * FROM ventas WHERE idCliente = ? ${queryStatus}`,
                [idCliente]
            );
            return ventas;
        },
        getLastSaleByClient: async (_,{idCliente}) => {
            try {
                
                const [date] = await connection.query(
                    `   
                       SELECT fecha FROM ventas WHERE idCliente = ? ORDER BY fecha DESC LIMIT 1;
                    `, [idCliente]
                );

                if(date.length > 0){
                    return date[0].fecha;
                }
                
                return '';
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
        getClientStats: async (_,{idCliente}) => {
            try {
                
                const [sales] = await connection.query(
                    `   
                       SELECT IFNULL(SUM(total),0) AS total_comprado, COUNT(idVenta) AS total_compras FROM ventas WHERE idCliente = ? AND (STATUS = 1 OR STATUS = 0);
                    `, [idCliente]
                );
                
                return sales[0];
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
    },
    Sale: {
        getProducts: async (parent) => {
            const [products] = await connection.query(
                `SELECT 
                    p.descripcion, pv.id,
                    pv.cantidad,
                    p.precio, p.img_producto 
                    FROM productos_venta pv
                    INNER JOIN productos p ON pv.idProducto = p.idProducto
                    WHERE pv.idVenta = ?`,
                [parent.idVenta]
            );
            return products;
        },
    },
    Mutation : {
        insertSale: async(_,{ input }, ctx) => {

            try {
                let status = 1;

                const { total, idCliente, fecha, tipo, productos, abono, municipio} = input;

                if(tipo === 1){
                    status = 0;
                }

                const venta = await connection.execute(
                    `
                       INSERT INTO ventas SET total = ?, usuario_reg = ?, idCliente = ?, fecha = NOW(), tipo = ?, status = ?; 
                    `,[total, ctx.usuario.idUsuario, idCliente, tipo, status]
                );

                for(const producto of productos){
                    
                    const productosVenta = await connection.execute(
                        `
                           INSERT INTO productos_venta SET idVenta = ?, idProducto = ?, cantidad = ?, precio = ?; 
                        `,[venta[0].insertId, producto.idProducto, producto.cantidad, producto.precio]
                    
                    );
                }
   
                if(abono > 0 && tipo !== 1){
                    const abonoI = await connection.execute(
                        `
                            INSERT INTO abonos SET idVenta = ?, abono = ?, fecha_reg = NOW(), usuario_reg = ?, tipo = 2; 
                        `,[venta[0].insertId, abono, ctx.usuario.idUsuario]
                        
                    );
                }

                if(tipo === 1){
                    const abonoI = await connection.execute(
                        `
                            INSERT INTO abonos SET idVenta = ?, abono = ?, fecha_reg = NOW(), usuario_reg = ?, tipo = 4; 
                        `,[venta[0].insertId, total, ctx.usuario.idUsuario]
                        
                    );
                }

                if(municipio === 1){
                    for(const producto of productos){
                    
                        const inventariosVenta = await connection.execute(
                            `
                            UPDATE inventario_rosario SET stock = (stock - ?) WHERE idProducto = ?; 
                            `,[producto.cantidad, producto.idProducto]
                        
                        );
                    }
                }else if(municipio === 2){
                    for(const producto of productos){
                    
                        const inventariosVenta = await connection.execute(
                            `
                            UPDATE inventario_escuinapa SET stock = (stock - ?) WHERE idProducto = ?; 
                            `,[producto.cantidad, producto.idProducto]
                        
                        );
                    }
                }
                
                return "Se insertó mi pa."
                
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

export default salesResolver;
