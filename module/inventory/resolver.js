import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const inventoryResolver = {
    Query : {
        getPendingInventoryR: async (_,{}) => {
            try {
                
                const [pendingInventoryR] = await connection.query(
                    `   
                        SELECT SUM(min_stock - stock) AS pending_products
                            FROM inventario_rosario
                            WHERE stock < min_stock;
                    `, []
                );
                
                return pendingInventoryR[0].pending_products;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener el inventario pendiente.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getPendingInventoryE: async (_,{}) => {
            try {
                const [pendingInventoryE] = await connection.query(
                    `   
                        SELECT SUM(min_stock - stock) AS pending_products
                            FROM inventario_escuinapa
                            WHERE stock < min_stock;
                    `, []
                );
                
                return pendingInventoryE[0].pending_products;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener el inventario pendiente.",{
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
    
};

export default inventoryResolver;
