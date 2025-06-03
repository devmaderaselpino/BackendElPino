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
    },
    
};

export default salesResolver;
