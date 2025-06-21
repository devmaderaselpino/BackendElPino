import { ApolloServer } from "@apollo/server";
import express from 'express';
import 'dotenv/config';
import schema from "./module/schema.js";
import { expressMiddleware } from "@apollo/server/express4";
import http from 'http'
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cors from 'cors';
import jsonwebtoken from 'jsonwebtoken';

var usuario;

const app = express();
app.use(express.json({limit:"200mb"}))
const httpServer = http.createServer(app);

const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
});

const PORT = 4000;

async function startApolloServer() {
    await server.start();
    app.use(
        '/graphql', 
        cors(),
        expressMiddleware(server, {
            context: async({ req }) =>{
                const token = req.headers.authorization || '';
                if (token) {
                    try {
                        usuario = jsonwebtoken.verify(token, process.env.SECRETA);
                        return {
                            usuario
                        } 
                    } catch (error) {
                        console.log("Hubo un error: ",error);
                        throw new ApolloError("Acceso denegado", "UNAUTHORIZED");
                    }
                } 
            }
        })
    );
    await new Promise((resolve) => httpServer.listen({port: PORT},resolve));
    console.log(`🚀  Server ready at: http://localhost:${PORT}/graphql`);
}
startApolloServer().catch(error => {
    console.log("Error al iniciar el servidor: ", error)
});