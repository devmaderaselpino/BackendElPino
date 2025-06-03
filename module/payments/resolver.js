import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const paymentResolver = {
    Query : {
       
        expiredPayments: async (_,{}) => {
            try {
                
                const [payments] = await connection.query(
                    `   
                        SELECT COUNT(idAbonoProgramado) AS expiredPayments 
                            FROM abonos_programados WHERE fecha_programada < CURRENT_DATE() AND pagado = 0;
                    `, []
                );
                
                return payments[0].expiredPayments;
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

export default paymentResolver;
