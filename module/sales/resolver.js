import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const salesResolver = {
    Query : {
       
        sales: async (_,{}) => {
            try {
                
                const [sales] = await connection.query(
                    `   
                       SELECT COUNT(idVenta) AS currentSales FROM ventas WHERE DATE(fecha) = CURRENT_DATE();
                    `, []
                );
                
                return sales[0].currentSales;
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
    
};

export default salesResolver;
