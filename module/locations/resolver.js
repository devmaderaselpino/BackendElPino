import connection from "../../Config/connectionSQL.js";
import { GraphQLError } from "graphql";

const locationResolver = {
    Query : {
        getColonias: async (_,{filter}) => {
            let query = "";
            if(filter !== 0){
                query = `WHERE idMunicipio = ${filter}`
            }

            try {
               const [colonias] = await connection.query(
                    `   
                        SELECT 0 AS idColonia, "Todas las colonias" AS nombre
                        UNION
                        SELECT idColonia, nombre FROM colonias ${query};
                    `,
                );
                
                return colonias;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener las colonias.",{
                    extensions:{
                        code: "BAD_REQUEST",
                        http: {
                            "status" : 400
                        }
                    }
                });
                
            }
        },
        getMunicipios: async (_,{}) => {
            
            try {
               const [municipios] = await connection.query(
                    `   SELECT 0 AS idMunicipio, "Todos los municipios" AS nombre
                        UNION
                        SELECT idMunicipio, nombre FROM municipios;
                    `,
                );
                
                return municipios;
            } catch (error) {
                console.log(error);
                throw new GraphQLError("Error al obtener los municipios.",{
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

export default locationResolver;
