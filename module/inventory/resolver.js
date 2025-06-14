import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const inventoryResolver = {
    Query : {
        getPendingInventory: async (_,{tipo}) => {
            try {
                
                if( tipo === 1 ) {
                    const [pendingInventory] = await connection.query(
                        `   
                            SELECT SUM(stock) AS stock, 
                                (SELECT SUM(min_stock - stock)
                                FROM inventario_rosario
                                WHERE stock < min_stock) AS productos_pendientes
                                FROM inventario_rosario;
                        `, []
                    );

                    return [
                        {
                            name: "Disponible",
                            value: pendingInventory[0].stock,
                            color: "#10b981",
                            description: "Productos en stock",
                        },
                        {
                            name: "Faltante",
                            value: pendingInventory[0].productos_pendientes,
                            color: "#ef4444",
                            description: "Productos agotados",
                        },
                    ]
                } else{
                    const [pendingInventory] = await connection.query(
                        `   
                            SELECT SUM(stock) AS stock, 
                                (SELECT SUM(min_stock - stock)
                                FROM inventario_escuinapa
                                WHERE stock < min_stock) AS productos_pendientes
                                FROM inventario_escuinapa;
                        `, []
                    );

                    return [
                        {
                            name: "Disponible",
                            value: pendingInventory[0].stock,
                            color: "#10b981",
                            description: "Productos en stock",
                        },
                        {
                            name: "Faltante",
                            value: pendingInventory[0].productos_pendientes,
                            color: "#ef4444",
                            description: "Productos agotados",
                        },
                    ]
                }
                
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
